import { prisma } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import type { BookingInput } from '@/schemas/booking';

export class BookingError extends Error {
  constructor(public readonly code: 'SLOT_NOT_AVAILABLE' | 'SERVICE_NOT_FOUND') {
    super(code);
    this.name = 'BookingError';
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
          serviceId: input.serviceId,
          timeSlotId: input.timeSlotId,
          priceCentsAtBooking: service.priceCents,
          status: 'PENDING',
        },
      });

      return booking;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
