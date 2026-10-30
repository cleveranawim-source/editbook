import { expect, test } from "vitest";
import { createUser } from "@/lib/users";
import {
  addMember, assertBookActive, createBook, getRole, listAllBooks, removeMember, setBookStatus,
} from "@/lib/books";
import { AppError } from "@/lib/errors";
import { createPart } from "@/lib/parts";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";

async function user(id: string, name = id) {
  return createUser({ loginId: id, name, password: "temp-pass-1" });
}

test("createBook adds the editor as EDITOR member and trims title", async () => {
  await resetDb();
  const e = await user("e1");
  const b = await createBook({ title: " 우리 책 ", editorUserId: e.id });
  expect(b.title).toBe("우리 책");
  expect(b.status).toBe("ACTIVE");
  expect(await getRole(b.id, e.id)).toBe("EDITOR");
});

test("createBook rejects empty title and unknown editor", async () => {
  await resetDb();
  const e = await user("e1");
  await expect(createBook({ title: "  ", editorUserId: e.id })).rejects.toThrow("책 제목을 입력하세요.");
  await expect(createBook({ title: "x", editorUserId: "nope" })).rejects.toThrow("편집장 계정을 찾을 수 없습니다.");
  expect(await listAllBooks()).toHaveLength(0);
});

test("addMember upserts role; rejects archived/missing book", async () => {
  await resetDb();
  const e = await user("e1");
  const w = await user("w1");
  const b = await createBook({ title: "책", editorUserId: e.id });
  await addMember(b.id, w.id, "AUTHOR");
  expect(await getRole(b.id, w.id)).toBe("AUTHOR");
  await addMember(b.id, w.id, "EDITOR");
  expect(await getRole(b.id, w.id)).toBe("EDITOR");
  await setBookStatus(b.id, "ARCHIVED");
  await expect(addMember(b.id, w.id, "AUTHOR")).rejects.toThrow("보관된 책은 바꿀 수 없습니다.");
  await expect(addMember("nope", w.id, "AUTHOR")).rejects.toBeInstanceOf(AppError);
  await expect(assertBookActive("nope")).rejects.toThrow("책을 찾을 수 없습니다.");
});

test("removeMember refuses last editor, allows others, no-op for non-member", async () => {
  await resetDb();
  const e = await user("e1");
  const w = await user("w1");
  const b = await createBook({ title: "책", editorUserId: e.id });
  await addMember(b.id, w.id, "AUTHOR");
  await expect(removeMember(b.id, e.id)).rejects.toThrow("편집장은 한 명 이상 있어야 합니다.");
  await removeMember(b.id, w.id);
  expect(await getRole(b.id, w.id)).toBeNull();
  await removeMember(b.id, w.id);
  await addMember(b.id, w.id, "EDITOR");
  await removeMember(b.id, e.id);
  expect(await getRole(b.id, e.id)).toBeNull();
  await setBookStatus(b.id, "ARCHIVED");
  await expect(removeMember(b.id, w.id)).rejects.toThrow("보관된 책은 바꿀 수 없습니다.");
});

test("listAllBooks orders ACTIVE first then newest, includes members.user", async () => {
  await resetDb();
  const e = await user("e1", "편집");
  const a = await createBook({ title: "A", editorUserId: e.id });
  const b = await createBook({ title: "B", editorUserId: e.id });
  const c = await createBook({ title: "C", editorUserId: e.id });
  await setBookStatus(b.id, "ARCHIVED");
  await setBookStatus(b.id, "ARCHIVED");
  const list = await listAllBooks();
  expect(list.map((x) => x.title)).toEqual(["C", "A", "B"]);
  expect(list[0].members[0].user.name).toBe("편집");
  await setBookStatus(b.id, "ACTIVE");
  expect((await listAllBooks()).map((x) => x.id)).toEqual([c.id, b.id, a.id]);
});

test("removeMember clears the removed member's part assignments", async () => {
  await resetDb();
  const e = await user("e2");
  const w = await user("w2");
  const b = await createBook({ title: "책", editorUserId: e.id });
  await addMember(b.id, w.id, "AUTHOR");
  const part = await createPart({ bookId: b.id, title: "1장", assigneeUserId: w.id });
  expect(part.assigneeUserId).toBe(w.id);
  await removeMember(b.id, w.id);
  const after = await prisma.part.findUnique({ where: { id: part.id } });
  expect(after?.assigneeUserId).toBeNull();
});
