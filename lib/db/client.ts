import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/db/generated/client";

// Prisma 7 requires a driver adapter. We use the node-postgres adapter against the single
// DATABASE_URL. A global singleton avoids exhausting connections under Next.js hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
