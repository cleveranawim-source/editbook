import { expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { createUser, listUsers, resetPassword } from "@/lib/users";
import { AppError } from "@/lib/errors";
import { resetDb } from "../helpers/db";

test("createUser creates with mustChangePassword and hashed password", async () => {
  await resetDb();
  const u = await createUser({ loginId: " t1 ", name: "김교사", password: "temp-pass-1" });
  expect(u.loginId).toBe("t1");
  expect(u.isAdmin).toBe(false);
  expect(u.mustChangePassword).toBe(true);
  expect(await verifyPassword("temp-pass-1", u.passwordHash)).toBe(true);
  const a = await createUser({ loginId: "a1", name: "관리", password: "temp-pass-1", isAdmin: true });
  expect(a.isAdmin).toBe(true);
});

test("createUser rejects duplicate id, empty fields, short password", async () => {
  await resetDb();
  await createUser({ loginId: "t1", name: "김교사", password: "temp-pass-1" });
  await expect(
    createUser({ loginId: "t1", name: "다른", password: "temp-pass-1" }),
  ).rejects.toThrow(new AppError("이미 있는 아이디입니다."));
  await expect(
    createUser({ loginId: " ", name: "x", password: "temp-pass-1" }),
  ).rejects.toThrow(new AppError("아이디와 이름을 입력하세요."));
  await expect(
    createUser({ loginId: "x", name: "", password: "temp-pass-1" }),
  ).rejects.toThrow(new AppError("아이디와 이름을 입력하세요."));
  await expect(
    createUser({ loginId: "x", name: "x", password: "short" }),
  ).rejects.toThrow(new AppError("비밀번호는 8자 이상이어야 합니다."));
});

test("resetPassword replaces hash, sets flag, deletes all sessions", async () => {
  await resetDb();
  const u = await createUser({ loginId: "t1", name: "김교사", password: "temp-pass-1" });
  await prisma.user.update({ where: { id: u.id }, data: { mustChangePassword: false } });
  await createSession(u.id);
  await createSession(u.id);
  await resetPassword(u.id, "new-pass-123");
  const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
  expect(after.mustChangePassword).toBe(true);
  expect(await verifyPassword("new-pass-123", after.passwordHash)).toBe(true);
  expect(await prisma.session.count({ where: { userId: u.id } })).toBe(0);
  await expect(resetPassword(u.id, "short")).rejects.toThrow(
    new AppError("비밀번호는 8자 이상이어야 합니다."),
  );
});

test("listUsers orders by name", async () => {
  await resetDb();
  await createUser({ loginId: "b", name: "하", password: "temp-pass-1" });
  await createUser({ loginId: "a", name: "가", password: "temp-pass-1" });
  expect((await listUsers()).map((u) => u.name)).toEqual(["가", "하"]);
});
