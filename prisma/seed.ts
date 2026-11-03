import "dotenv/config";
import { prisma } from "@/lib/db";
import { ensureAdmin, isSafeInitialPassword, normalizeLoginId } from "@/lib/users";

async function main() {
  const loginId = process.env.ADMIN_LOGIN_ID || "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("ADMIN_PASSWORD 환경변수를 설정해 주세요.");
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production" && !isSafeInitialPassword(password)) {
    console.error(
      "운영 환경에서는 예시 비밀번호(change-me-now)나 8자 미만의 ADMIN_PASSWORD를 쓸 수 없습니다. .env의 ADMIN_PASSWORD를 바꿔 주세요.",
    );
    process.exit(1);
  }
  const before = await prisma.user.findUnique({ where: { loginId: normalizeLoginId(loginId) } });
  await ensureAdmin(loginId, password);
  console.log(
    before
      ? `관리자 '${loginId}' 계정이 이미 있습니다. 변경하지 않았습니다.`
      : `관리자 '${loginId}' 계정을 만들었습니다. 첫 로그인 때 비밀번호를 바꿔야 합니다.`,
  );
}

main().finally(() => prisma.$disconnect());
