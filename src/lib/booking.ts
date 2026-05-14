import { prisma } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import type { BookingInput } from '@/schemas/booking';
import { parsePriceMatrix, selectedOptionsSchema, calculatePrice } from '@/schemas/priceMatrix';

export class BookingError extends Error {
  constructor(public readonly code: 'SLOT_NOT_AVAILABLE' | 'SERVICE_NOT_FOUND') {
    super(code);
    this.name = 'BookingError';
  }
}

export class BookingTransitionError extends Error {
  constructor(public readonly code: 'BOOKING_NOT_FOUND' | 'INVALID_TRANSITION') {
    super(code);
    this.name = 'BookingTransitionError';
  }
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED', 'NO_SHOW'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

function assertTransition(currentStatus: string, targetStatus: string) {
  if (!VALID_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
    throw new BookingTransitionError('INVALID_TRANSITION');
  }
}

export async function createBooking(input: BookingInput) {
  const bookingStartsAt = new Date(input.bookingStartsAt);
  const bookingEndsAt = new Date(input.bookingEndsAt);

  return prisma.$transaction(
    async (tx) => {
      const service = await tx.service.findUnique({
        where: { id: input.serviceId, active: true },
      });
      if (!service) throw new BookingError('SERVICE_NOT_FOUND');

      const slot = await tx.timeSlot.findUnique({
        where: { id: input.timeSlotId },
      });
      if (!slot || slot.status !== 'OPEN') {
        throw new BookingError('SLOT_NOT_AVAILABLE');
      }

      // Vérifie que le RDV est bien dans la fenêtre de disponibilité
      if (bookingStartsAt < slot.startsAt || bookingEndsAt > slot.endsAt) {
        throw new BookingError('SLOT_NOT_AVAILABLE');
      }

      // Anti-double-booking : vérifie l'absence de chevauchement avec les réservations actives
      const overlapping = await tx.booking.count({
        where: {
          timeSlotId: slot.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          bookingStartsAt: { lt: bookingEndsAt },
          bookingEndsAt: { gt: bookingStartsAt },
        },
      });
      if (overlapping > 0) {
        throw new BookingError('SLOT_NOT_AVAILABLE');
      }

      let priceCentsAtBooking = service.priceCents;
      let storedOptions: string | null = null;
      if (input.selectedOptionsJson && service.priceMatrix) {
        const matrix = parsePriceMatrix(service.priceMatrix);
        if (matrix) {
          try {
            const opts = selectedOptionsSchema.parse(JSON.parse(input.selectedOptionsJson));
            priceCentsAtBooking = calculatePrice(matrix, opts);
            storedOptions = input.selectedOptionsJson;
          } catch {
            // Fall back to base price
          }
        }
      }

      // Résoudre les prix des produits dans la transaction
      let productLines: { productId: string; quantity: number; priceCentsAtBooking: number }[] = [];
      if (input.selectedProducts && input.selectedProducts.length > 0) {
        const productIds = input.selectedProducts.map((p) => p.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, active: true },
          select: { id: true, priceCents: true },
        });
        productLines = input.selectedProducts
          .map((sp) => {
            const p = products.find((pr) => pr.id === sp.productId);
            if (!p) return null;
            return { productId: p.id, quantity: sp.quantity, priceCentsAtBooking: p.priceCents };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);
      }

      const booking = await tx.booking.create({
        data: {
          customerFirstName: input.firstName,
          customerPhone: input.phone,
          notes: input.notes ?? null,
          selectedOptions: storedOptions,
          serviceId: input.serviceId,
          timeSlotId: input.timeSlotId,
          bookingStartsAt,
          bookingEndsAt,
          priceCentsAtBooking,
          paymentReference: input.paymentReference ?? null,
          paymentProofUrl: input.paymentProofUrl ?? null,
          status: 'PENDING',
          products: productLines.length > 0
            ? { create: productLines }
            : undefined,
        },
      });

      return booking;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function confirmBooking(id: string) {
  return prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new BookingTransitionError('BOOKING_NOT_FOUND');
      assertTransition(booking.status, 'CONFIRMED');

      return tx.booking.update({
        where: { id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function rejectBooking(id: string, reason?: string) {
  return prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new BookingTransitionError('BOOKING_NOT_FOUND');
      assertTransition(booking.status, 'REJECTED');

      return tx.booking.update({
        where: { id },
        data: { status: 'REJECTED', cancellationReason: reason ?? null },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function cancelBooking(id: string, reason?: string) {
  return prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new BookingTransitionError('BOOKING_NOT_FOUND');
      assertTransition(booking.status, 'CANCELLED');

      return tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason ?? null,
          cancelledAt: new Date(),
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function markCompleted(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new BookingTransitionError('BOOKING_NOT_FOUND');
  assertTransition(booking.status, 'COMPLETED');
  return prisma.booking.update({ where: { id }, data: { status: 'COMPLETED' } });
}

export async function markNoShow(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new BookingTransitionError('BOOKING_NOT_FOUND');
  assertTransition(booking.status, 'NO_SHOW');
  return prisma.booking.update({ where: { id }, data: { status: 'NO_SHOW' } });
}

export async function anonymizeBooking(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new BookingTransitionError('BOOKING_NOT_FOUND');
  return prisma.booking.update({
    where: { id },
    data: {
      customerFirstName: '[supprimé]',
      customerPhone: '[supprimé]',
      notes: '[supprimé]',
    },
  });
}
