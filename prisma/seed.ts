import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { addDays } from 'date-fns';
import bcrypt from 'bcryptjs';
import { computeSlots } from '../src/lib/slots';

const dbUrl = (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '');
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbUrl }) });

async function main() {
  // Admin
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? 'changeme',
    12,
  );
  await prisma.admin.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com' },
    update: {},
    create: {
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
      passwordHash,
      name: process.env.SEED_ADMIN_NAME ?? 'Admin',
    },
  });

  // Prestations type coiffeuse
  const services = [
    { slug: 'tresses-collees', name: 'Tresses collées', description: 'Tresses africaines plaquées au cuir chevelu, finition soignée.', durationMinutes: 180, priceCents: 6000, sortOrder: 1 },
    { slug: 'tissage', name: 'Tissage', description: 'Pose de tissage avec ou sans fermeture.', durationMinutes: 240, priceCents: 12000, sortOrder: 2 },
    { slug: 'lissage-bresilien', name: 'Lissage brésilien', description: 'Soin lissant longue durée.', durationMinutes: 180, priceCents: 9000, sortOrder: 3 },
    { slug: 'coloration', name: 'Coloration', description: 'Coloration complète, racines ou mèches.', durationMinutes: 120, priceCents: 5000, sortOrder: 4 },
    { slug: 'box-braids', name: 'Box braids', description: 'Tresses individuelles longues.', durationMinutes: 360, priceCents: 9000, sortOrder: 5 },
    { slug: 'soin-capillaire', name: 'Soin capillaire', description: "Masque nourrissant et coupe d'entretien.", durationMinutes: 60, priceCents: 3000, sortOrder: 6 },
  ];
  for (const s of services) {
    await prisma.service.upsert({ where: { slug: s.slug }, update: {}, create: s });
  }

  // Disponibilités récurrentes : mardi à samedi, 9h-19h, créneaux de 30 min
  for (let day = 2; day <= 6; day++) {
    await prisma.recurringAvailability.upsert({
      where: { id: `default-day-${day}` },
      update: {},
      create: {
        id: `default-day-${day}`,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '19:00',
        slotMinutes: 30,
        active: true,
      },
    });
  }

  // Génération des fenêtres de disponibilité pour les 8 prochaines semaines
  const nowUtc = new Date();
  const windowEnd = addDays(nowUtc, 56); // 8 semaines
  const rules = await prisma.recurringAvailability.findMany({ where: { active: true } });
  const blockedDates = await prisma.blockedDate.findMany();
  const slots = computeSlots(rules, blockedDates, nowUtc, windowEnd);

  await prisma.timeSlot.deleteMany({}); // Nettoie les anciens créneaux
  if (slots.length > 0) {
    await prisma.timeSlot.createMany({
      data: slots.map((s) => ({ ...s, status: 'OPEN' })),
    });
  }

  console.log(`Seed terminé. ${slots.length} fenêtres de disponibilité créées.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
