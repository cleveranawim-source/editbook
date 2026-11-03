import { ensureAdmin, isSafeInitialPassword } from "@/lib/users";

/**
 * 서버가 뜰 때 관리자 계정을 보장한다(빌드 단계의 시드와 같은 일을 한 번 더).
 * 환경변수가 없거나 운영에서 안전하지 않은 비밀번호면 아무것도 하지 않는다.
 * 돌려주는 값은 로그·상태 확인용 설명.
 */
export async function ensureAdminFromEnv(): Promise<string> {
  const loginId = process.env.ADMIN_LOGIN_ID || "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return "ADMIN_PASSWORD 없음 — 건너뜀";
  if (process.env.NODE_ENV === "production" && !isSafeInitialPassword(password)) {
    return "ADMIN_PASSWORD가 예시 값이거나 8자 미만 — 건너뜀";
  }
  await ensureAdmin(loginId, password);
  return `관리자 '${loginId}' 보장됨`;
}
