import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors";
import type { User } from "@/generated/prisma/client";

export async function authenticate(loginId: string, password: string): Promise<User> {
  const fail = new AppError("아이디 또는 비밀번호가 맞지 않습니다.");
  const user = await prisma.user.findUnique({ where: { loginId: loginId.trim() } });
  if (!user) throw fail;
  if (!(await verifyPassword(password, user.passwordHash))) throw fail;
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
export async function ensureAdmin(loginId: string, password: string): Promise<User> {
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
  const loginId = input.loginId.trim();
  const name = input.name.trim();
  if (!loginId || !name) throw new AppError("아이디와 이름을 입력하세요.");
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
