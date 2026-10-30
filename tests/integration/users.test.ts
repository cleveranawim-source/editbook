import { expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { authenticate, changePassword } from "@/lib/users";
import { AppError } from "@/lib/errors";
import { resetDb } from "../helpers/db";

async function makeUser() {
  return prisma.user.create({
    data: {
      loginId: "teacher1",
      name: "김교사",
      passwordHash: await hashPassword("old-password"),
    },
  });
}

test("authenticate ok / wrong password / unknown id", async () => {
  await resetDb();
  const user = await makeUser();
  const ok = await authenticate("teacher1", "old-password");
  expect(ok.id).toBe(user.id);
  const msg = "아이디 또는 비밀번호가 맞지 않습니다.";
  await expect(authenticate("teacher1", "nope")).rejects.toThrow(new AppError(msg));
  await expect(authenticate("ghost", "old-password")).rejects.toThrow(new AppError(msg));
});

test("changePassword enforces min length and clears mustChangePassword", async () => {
  await resetDb();
  const user = await makeUser();
  expect(user.mustChangePassword).toBe(true);
  await expect(changePassword(user.id, "short")).rejects.toThrow(
    "비밀번호는 8자 이상이어야 합니다.",
  );
  expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).mustChangePassword).toBe(true);
  await changePassword(user.id, "new-password-1");
  const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(after.mustChangePassword).toBe(false);
  expect(await verifyPassword("new-password-1", after.passwordHash)).toBe(true);
});

test("changePassword deletes other sessions", async () => {
  await resetDb();
  const user = await makeUser();
  await createSession(user.id);
  await createSession(user.id);
  await changePassword(user.id, "new-password-1");
  expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
});
