import { prisma } from "@/lib/db";

export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Part","BookMember","Book","Session","User" CASCADE',
  );
}
