import { NextResponse } from 'next/server';
import { formatInTimeZone } from 'date-fns-tz';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const PARIS_TZ = 'Europe/Paris';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startStr = searchParams.get('start');
  const endStr = searchParams.get('end');

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['CONFIRMED', 'PENDING'] },
      ...(startStr && endStr
        ? { bookingStartsAt: { gte: new Date(startStr), lte: new Date(endStr) } }
        : {}),
    },
    include: { service: true },
  });

  const events = bookings.map((b) => ({
    id: b.id,
    title: `${b.customerFirstName} — ${b.service.name}`,
    start: formatInTimeZone(b.bookingStartsAt, PARIS_TZ, "yyyy-MM-dd'T'HH:mm:ss"),
    end: formatInTimeZone(b.bookingEndsAt, PARIS_TZ, "yyyy-MM-dd'T'HH:mm:ss"),
    backgroundColor: b.status === 'PENDING' ? '#f97316' : '#ef4444',
    borderColor: b.status === 'PENDING' ? '#ea580c' : '#dc2626',
    textColor: '#ffffff',
    extendedProps: { bookingId: b.id },
  }));

  return NextResponse.json(events);
}
