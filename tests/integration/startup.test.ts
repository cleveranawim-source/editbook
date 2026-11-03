import { afterEach, expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { ensureAdminFromEnv } from "@/lib/startup";
import { resetDb } from "../helpers/db";

const saved = { id: process.env.ADMIN_LOGIN_ID, pw: process.env.ADMIN_PASSWORD };
afterEach(() => {
  process.env.ADMIN_LOGIN_ID = saved.id;
  process.env.ADMIN_PASSWORD = saved.pw;
});

test("ensureAdminFromEnv skips without env and creates once with env", async () => {
  await resetDb();
  delete process.env.ADMIN_LOGIN_ID;
  delete process.env.ADMIN_PASSWORD;
  expect(await ensureAdminFromEnv()).toContain("건너뜀");
  expect(await prisma.user.count()).toBe(0);
  process.env.ADMIN_PASSWORD = "first-pass-1";
  // ADMIN_LOGIN_ID가 없으면 admin
  expect(await ensureAdminFromEnv()).toBe("관리자 'admin' 보장됨");
  process.env.ADMIN_LOGIN_ID = "Admin";
  await ensureAdminFromEnv();
  expect(await prisma.user.count({ where: { isAdmin: true, loginId: "admin" } })).toBe(1);
});
