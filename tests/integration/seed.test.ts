import { expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { ensureAdmin } from "@/lib/users";
import { resetDb } from "../helpers/db";

test("ensureAdmin creates an admin who must change password", async () => {
  await resetDb();
  const u = await ensureAdmin("admin", "first-pass-1");
  expect(u.isAdmin).toBe(true);
  expect(u.mustChangePassword).toBe(true);
  expect(await verifyPassword("first-pass-1", u.passwordHash)).toBe(true);
});

test("ensureAdmin is idempotent and never overwrites the password", async () => {
  await resetDb();
  const a = await ensureAdmin("admin", "first-pass-1");
  const b = await ensureAdmin("admin", "other-pass-2");
  expect(b.id).toBe(a.id);
  expect(await prisma.user.count()).toBe(1);
  expect(await verifyPassword("first-pass-1", b.passwordHash)).toBe(true);
  expect(await verifyPassword("other-pass-2", b.passwordHash)).toBe(false);
});
