import { prisma } from "@/lib/db";

export async function resetDb(): Promise<void> {
  if (!process.env.DATABASE_URL?.includes("_test")) {
    throw new Error(
      "테스트 DB(DATABASE_URL에 _test 포함)가 아니므로 resetDb()를 실행할 수 없습니다.",
    );
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Version","Part","BookMember","Book","Session","User" CASCADE',
  );
}
