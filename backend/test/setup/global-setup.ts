import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { assertConnectedToTestDatabase, resetDb } from '../utils/test-database';
import { testEnv } from './test-env';

const BACKEND_DIR = join(__dirname, '..', '..');
const STOCK_CONSTRAINT_SQL = join(
  BACKEND_DIR,
  'prisma/migrations/20260910213000_add_ticket_stock_constraint/migration.sql',
);

// Deja la base de test vacía y con el schema al día antes de correr la suite.
export default async function globalSetup() {
  Object.assign(process.env, testEnv);

  const prisma = new PrismaClient();
  try {
    await assertConnectedToTestDatabase(prisma);

    execSync('npx prisma db push --skip-generate', {
      cwd: BACKEND_DIR,
      env: process.env,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    await resetDb(prisma);

    // db push no conoce los CHECK: la restricción de stock se aplica aparte.
    const [{ exists }] = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_stock_limits'
      ) AS "exists"`;
    if (!exists) {
      await prisma.$executeRawUnsafe(
        readFileSync(STOCK_CONSTRAINT_SQL, 'utf8'),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
