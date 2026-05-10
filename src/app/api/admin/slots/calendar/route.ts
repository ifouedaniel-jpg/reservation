import { NextResponse } from 'next/server';
import { formatInTimeZone } from 'date-fns-tz';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const PARIS_TZ = 'Europe/Paris';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startStr = searchParams.get('start');
  const endStr = searchParams.get('end');

  const slots = await prisma.timeSlot.findMany({
    where: {
      status: { in: ['OPEN', 'CLOSED'] },
      ...(startStr && endStr
        ? { startsAt: { gte: new Date(startStr), lte: new Date(endStr) } }
        : {}),
    },
    orderBy: { startsAt: 'asc' },
  });

  const events = slots.map((slot) => {
    const isOpen = slot.status === 'OPEN';
    const dateStr = formatInTimeZone(slot.startsAt, PARIS_TZ, 'yyyy-MM-dd');
    return {
      id: `slot-${slot.id}`,
      title: isOpen ? 'Libre' : 'Fermé',
      start: formatInTimeZone(slot.startsAt, PARIS_TZ, "yyyy-MM-dd'T'HH:mm:ss"),
      end: formatInTimeZone(slot.endsAt, PARIS_TZ, "yyyy-MM-dd'T'HH:mm:ss"),
      backgroundColor: isOpen ? '#22c55e' : '#d1d5db',
      borderColor: isOpen ? '#16a34a' : '#9ca3af',
      textColor: isOpen ? '#ffffff' : '#6b7280',
      extendedProps: { type: 'slot', slotId: slot.id, date: dateStr },
    };
  });

  return NextResponse.json(events);
}
