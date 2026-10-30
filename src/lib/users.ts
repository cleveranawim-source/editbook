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
