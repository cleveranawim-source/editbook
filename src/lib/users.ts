import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors";
import type { User } from "@/generated/prisma/client";
import { ipThrottle, loginIdThrottle, retryMessage } from "@/lib/auth/throttle";

/** 로그인 아이디는 앞뒤 공백을 지우고 소문자로 통일한다(이메일 형식이므로). */
export function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase();
}

const LOGIN_ID_RE = /^[a-z0-9._@-]+$/;

/** 정규화된 아이디가 규칙(영문 소문자·숫자·. _ @ -)에 맞는지 확인하고, 아니면 AppError. */
export function assertValidLoginId(loginId: string): void {
  if (!LOGIN_ID_RE.test(loginId)) {
    throw new AppError("아이디는 영문 소문자·숫자와 . _ @ - 만 쓸 수 있습니다(공백 불가).");
  }
}

/** 시드용 초기 비밀번호 검사: 예시 값과 8자 미만을 거부한다. */
export function isSafeInitialPassword(p: string): boolean {
  return p !== "change-me-now" && p.length >= 8;
}

/**
 * 없는 아이디일 때도 bcrypt 비교를 한 번 수행해 응답 시간을 맞추기 위한 해시.
 * 실제 비밀번호와는 무관한 임의 값이다.
 */
const DUMMY_HASH = "$2b$10$AUS1AQY6oAVFcfOjSZhgD.rmP.H5J82gD6al1zfKiPNatJtaFTth6";

export async function authenticate(
  rawLoginId: string,
  password: string,
  opts?: { ip?: string },
): Promise<User> {
  const loginId = normalizeLoginId(rawLoginId);
  const idKey = `id:${loginId}`;
  const ipKey = opts?.ip ? `ip:${opts.ip}` : null;

  for (const [t, k] of [[loginIdThrottle, idKey], [ipThrottle, ipKey]] as const) {
    if (!k) continue;
    const c = t.check(k);
    if (c.locked) throw new AppError(retryMessage(c.retryAfterMs));
  }

  const user = await prisma.user.findUnique({ where: { loginId } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    const c = loginIdThrottle.fail(idKey);
    if (ipKey) ipThrottle.fail(ipKey);
    if (c.locked) throw new AppError(retryMessage(c.retryAfterMs));
    throw new AppError("아이디 또는 비밀번호가 맞지 않습니다.");
  }
  loginIdThrottle.succeed(idKey);
  return user;
}

/** 비밀번호를 바꾸고 그 사용자의 모든 세션을 지운다(호출 측에서 새 세션을 발급). */
export async function changePassword(userId: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new AppError("비밀번호는 8자 이상이어야 합니다.");
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
}

/** 관리자가 없으면 만들고, 있으면 그대로 돌려준다(비밀번호·플래그를 건드리지 않음). */
export async function ensureAdmin(rawLoginId: string, password: string): Promise<User> {
  const loginId = normalizeLoginId(rawLoginId);
  assertValidLoginId(loginId);
  const existing = await prisma.user.findUnique({ where: { loginId } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      loginId,
      name: "관리자",
      passwordHash: await hashPassword(password),
      isAdmin: true,
      mustChangePassword: true,
    },
  });
}

export async function createUser(input: {
  loginId: string;
  name: string;
  password: string;
  isAdmin?: boolean;
}): Promise<User> {
  const loginId = normalizeLoginId(input.loginId);
  const name = input.name.trim();
  if (!loginId || !name) throw new AppError("아이디와 이름을 입력하세요.");
  assertValidLoginId(loginId);
  if (input.password.length < 8) throw new AppError("비밀번호는 8자 이상이어야 합니다.");
  if (await prisma.user.findUnique({ where: { loginId } })) {
    throw new AppError("이미 있는 아이디입니다.");
  }
  try {
    return await prisma.user.create({
      data: {
        loginId,
        name,
        passwordHash: await hashPassword(input.password),
        isAdmin: input.isAdmin ?? false,
        mustChangePassword: true,
      },
    });
  } catch (e) {
    // 동시 생성 경쟁: 유니크 제약 위반
    if (typeof e === "object" && e && (e as { code?: string }).code === "P2002") {
      throw new AppError("이미 있는 아이디입니다.");
    }
    throw e;
  }
}

/** 관리자 비밀번호 초기화: 다음 로그인 때 변경을 강제하고 모든 세션을 끊는다. */
export async function resetPassword(userId: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) throw new AppError("비밀번호는 8자 이상이어야 합니다.");
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: true } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
}

export async function listUsers(): Promise<User[]> {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}
