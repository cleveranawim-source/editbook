import { expect, test } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

test("hash verifies and rejects wrong password", async () => {
  const h = await hashPassword("secret123");
  expect(h).not.toBe("secret123");
  expect(await verifyPassword("secret123", h)).toBe(true);
  expect(await verifyPassword("wrong", h)).toBe(false);
});

test("same password produces different hashes", async () => {
  expect(await hashPassword("secret123")).not.toBe(await hashPassword("secret123"));
});
