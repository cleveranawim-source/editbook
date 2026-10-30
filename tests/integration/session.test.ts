import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  createSession,
  deleteSession,
  getUserBySessionToken,
} from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { resetDb } from "../helpers/db";

async function makeUser() {
  return prisma.user.create({
    data: { loginId: "teacher1", name: "김교사", passwordHash: "x" },
  });
}

test("constants", () => {
  expect(SESSION_COOKIE).toBe("eb_session");
  expect(SESSION_DAYS).toBe(30);
});

test("AppError carries message", () => {
  const e = new AppError("오류");
  expect(e).toBeInstanceOf(Error);
  expect(e.message).toBe("오류");
});

test("session round trip stores only the hash and expires in 30 days", async () => {
  await resetDb();
  const user = await makeUser();
  const { token, expiresAt } = await createSession(user.id);
  expect(token).toMatch(/^[0-9a-f]{64}$/);
  const days = (expiresAt.getTime() - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(29.99);
  expect(days).toBeLessThanOrEqual(30);
  const row = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });
  expect(row.tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
  expect(row.tokenHash).not.toBe(token);
  expect((await getUserBySessionToken(token))?.id).toBe(user.id);
});

test("expired session returns null", async () => {
  await resetDb();
  const user = await makeUser();
  const { token } = await createSession(user.id);
  await prisma.session.updateMany({
    where: { userId: user.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  expect(await getUserBySessionToken(token)).toBeNull();
});

test("unknown token returns null", async () => {
  await resetDb();
  expect(await getUserBySessionToken("nope")).toBeNull();
});

test("deleteSession invalidates only that session", async () => {
  await resetDb();
  const user = await makeUser();
  const a = await createSession(user.id);
  const b = await createSession(user.id);
  await deleteSession(a.token);
  expect(await getUserBySessionToken(a.token)).toBeNull();
  expect((await getUserBySessionToken(b.token))?.id).toBe(user.id);
  await expect(deleteSession("nope")).resolves.toBeUndefined();
});
