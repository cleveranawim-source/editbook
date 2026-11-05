import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * 서버 함수(Vercel)는 여러 개가 동시에 뜨므로, 함수마다 연결을 많이 잡으면 데이터베이스 연결 한도를 넘는다
 * ("too many connections"). 그래서 연결 공유 주소(DATABASE_URL_POOLED)가 있으면 그것을 쓰고,
 * 함수 하나가 잡는 연결 수를 작게, 놀고 있는 연결은 빨리 돌려준다.
 * 마이그레이션(prisma.config.ts)은 직접 연결 주소를 따로 쓴다.
 */
function connectionString(): string | undefined {
  const pooled = process.env.DATABASE_URL_POOLED;
  if (pooled && /^postgres(ql)?:\/\//.test(pooled)) return pooled;
  return process.env.DATABASE_URL;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: connectionString(),
      max: Number(process.env.DB_POOL_MAX ?? 3),
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    }),
  });

// 같은 함수 안에서는 클라이언트 하나를 계속 쓴다(개발 중 다시 불러오기·서버리스 재사용 모두).
globalForPrisma.prisma = prisma;
