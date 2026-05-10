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

      // Calculate final price (server-side, never trust client)
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

      await tx.timeSlot.update({
        where: { id: slot.id },
        data: { status: 'PENDING' },
      });

      const booking = await tx.booking.create({
        data: {
          customerFirstName: input.firstName,
          customerLastName: input.lastName,
          customerPhone: input.phone,
          customerInstagram: input.instagram ?? null,
          customerEmail: input.email ?? null,
          preferredChannel: input.preferredChannel,
          notes: input.notes ?? null,
          selectedOptions: storedOptions,
          serviceId: input.serviceId,
          timeSlotId: input.timeSlotId,
          priceCentsAtBooking,
          status: 'PENDING',
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

      await tx.timeSlot.update({
        where: { id: booking.timeSlotId },
        data: { status: 'BOOKED' },
      });

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

      await tx.timeSlot.update({
        where: { id: booking.timeSlotId },
        data: { status: 'OPEN' },
      });

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

      await tx.timeSlot.update({
        where: { id: booking.timeSlotId },
        data: { status: 'OPEN' },
      });

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
      customerLastName: '[supprimé]',
      customerPhone: '[supprimé]',
      customerEmail: '[supprimé]',
      customerInstagram: '[supprimé]',
      notes: '[supprimé]',
    },
  });
}
