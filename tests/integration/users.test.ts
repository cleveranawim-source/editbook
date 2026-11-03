import { expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { authenticate, changePassword, createUser, ensureAdmin } from "@/lib/users";
import { ipThrottle, loginIdThrottle } from "@/lib/auth/throttle";
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

test("loginId is normalized: case-insensitive and trimmed", async () => {
  await resetDb();
  loginIdThrottle.reset();
  const u = await createUser({ loginId: "  Teacher.Two@School.KR ", name: "이교사", password: "pass-word-1" });
  expect(u.loginId).toBe("teacher.two@school.kr");
  const ok = await authenticate("TEACHER.two@school.kr", "pass-word-1");
  expect(ok.id).toBe(u.id);
  await expect(
    createUser({ loginId: "teacher.TWO@school.kr", name: "다른", password: "pass-word-1" }),
  ).rejects.toThrow("이미 있는 아이디입니다.");
  const admin = await ensureAdmin("Admin", "first-pass-1");
  expect(admin.loginId).toBe("admin");
});

test("ten failures lock the loginId for 15 minutes; success clears the count", async () => {
  await resetDb();
  loginIdThrottle.reset();
  ipThrottle.reset();
  await makeUser();
  for (let i = 0; i < 9; i++) {
    await expect(authenticate("teacher1", "nope", { ip: "10.0.0.1" })).rejects.toThrow(
      "아이디 또는 비밀번호가 맞지 않습니다.",
    );
  }
  await expect(authenticate("teacher1", "nope", { ip: "10.0.0.1" })).rejects.toThrow(
    "로그인 시도가 너무 많습니다. 15분 뒤에 다시 시도하세요.",
  );
  // 잠긴 동안에는 맞는 비밀번호도 거부된다.
  await expect(authenticate("Teacher1", "old-password")).rejects.toThrow("로그인 시도가 너무 많습니다.");
  // 다른 아이디는 영향받지 않는다.
  await expect(authenticate("ghost", "x", { ip: "10.0.0.1" })).rejects.toThrow(
    "아이디 또는 비밀번호가 맞지 않습니다.",
  );
  loginIdThrottle.reset();
  await authenticate("teacher1", "nope").catch(() => {});
  await authenticate("teacher1", "old-password");
  // 성공 뒤에는 실패 횟수가 0부터 다시 센다.
  for (let i = 0; i < 9; i++) {
    await expect(authenticate("teacher1", "nope")).rejects.toThrow("아이디 또는 비밀번호가 맞지 않습니다.");
  }
});

test("loginId with spaces or '=' is rejected", async () => {
  await resetDb();
  const msg = "아이디는 영문 소문자·숫자와 . _ @ - 만 쓸 수 있습니다(공백 불가).";
  await expect(
    createUser({ loginId: "SOME_KEY = value", name: "x", password: "pass-word-1" }),
  ).rejects.toThrow(msg);
  await expect(ensureAdmin("admin password", "pass-word-1")).rejects.toThrow(msg);
  await expect(createUser({ loginId: "kim.teacher@school.kr", name: "김", password: "pass-word-1" })).resolves.toBeTruthy();
});
