import { expect, test } from "vitest";
import { canEditPart, canManageBook, canViewBook } from "@/lib/permissions";

const admin = { id: "admin-1", isAdmin: true };
const user = { id: "user-1", isAdmin: false };

test("canViewBook: 관리자는 역할 없이도 볼 수 있다", () => {
  expect(canViewBook(admin, null)).toBe(true);
});

test("canViewBook: 역할이 있는 일반 사용자는 볼 수 있다", () => {
  expect(canViewBook(user, "AUTHOR")).toBe(true);
});

test("canViewBook: 역할이 없는 일반 사용자는 볼 수 없다", () => {
  expect(canViewBook(user, null)).toBe(false);
});

test("canManageBook: ACTIVE이고 관리자이면 관리할 수 있다", () => {
  expect(canManageBook(admin, null, "ACTIVE")).toBe(true);
});

test("canManageBook: ACTIVE이고 EDITOR이면 관리할 수 있다", () => {
  expect(canManageBook(user, "EDITOR", "ACTIVE")).toBe(true);
});

test("canManageBook: ACTIVE이지만 AUTHOR이면 관리할 수 없다", () => {
  expect(canManageBook(user, "AUTHOR", "ACTIVE")).toBe(false);
});

test("canEditPart: ACTIVE이고 담당자이면 편집할 수 있다", () => {
  expect(canEditPart(user, "AUTHOR", "ACTIVE", { assigneeUserId: "user-1" })).toBe(true);
});

test("canEditPart: 관리자는 역할이 없고 담당자도 아니면 편집할 수 없다", () => {
  expect(canEditPart(admin, null, "ACTIVE", { assigneeUserId: "user-1" })).toBe(false);
});

test("canEditPart: ARCHIVED 책에서는 EDITOR여도 편집할 수 없다", () => {
  expect(canEditPart(user, "EDITOR", "ARCHIVED", { assigneeUserId: null })).toBe(false);
});
