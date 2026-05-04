import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function dbPath() {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  return url.startsWith('file:') ? url.slice(5) : url;
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: dbPath() });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Active le mode WAL et un busy_timeout généreux pour gérer la concurrence.
// À appeler une fois au démarrage de l'app.
let pragmasApplied = false;
export async function applySqlitePragmas() {
  if (pragmasApplied) return;
  await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
  await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
  await prisma.$executeRawUnsafe('PRAGMA busy_timeout = 5000;');
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
  pragmasApplied = true;
}
