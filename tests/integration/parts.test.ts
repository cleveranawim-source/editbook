import { expect, test } from "vitest";
import { createUser } from "@/lib/users";
import { addMember, createBook, setBookStatus } from "@/lib/books";
import { createPart, listParts, reorderParts, updatePart } from "@/lib/parts";
import { resetDb } from "../helpers/db";

async function setup() {
  await resetDb();
  const e = await createUser({ loginId: "e1", name: "e1", password: "temp-pass-1" });
  const w = await createUser({ loginId: "w1", name: "w1", password: "temp-pass-1" });
  const x = await createUser({ loginId: "x1", name: "x1", password: "temp-pass-1" });
  const b = await createBook({ title: "책", editorUserId: e.id });
  await addMember(b.id, w.id, "AUTHOR");
  return { e, w, x, b };
}

test("createPart auto-increments order and trims title", async () => {
  const { b, w } = await setup();
  const p1 = await createPart({ bookId: b.id, title: " 1장 " });
  const p2 = await createPart({ bookId: b.id, title: "2장", assigneeUserId: w.id });
  expect([p1.order, p2.order, p1.title]).toEqual([1, 2, "1장"]);
  const list = await listParts(b.id);
  expect(list.map((p) => p.id)).toEqual([p1.id, p2.id]);
  expect(list[1].assignee?.id).toBe(w.id);
  await expect(createPart({ bookId: b.id, title: " " })).rejects.toThrow("파트 제목을 입력하세요.");
});

test("non-member assignee is rejected", async () => {
  const { b, x } = await setup();
  await expect(createPart({ bookId: b.id, title: "a", assigneeUserId: x.id })).rejects.toThrow("이 책의 참여자가 아닙니다.");
  const p = await createPart({ bookId: b.id, title: "a" });
  await expect(updatePart(p.id, { assigneeUserId: x.id })).rejects.toThrow("이 책의 참여자가 아닙니다.");
  await expect(updatePart("nope", { title: "z" })).rejects.toThrow("파트를 찾을 수 없습니다.");
});

test("updatePart changes fields and can clear assignee", async () => {
  const { b, w } = await setup();
  const p = await createPart({ bookId: b.id, title: "a", assigneeUserId: w.id });
  const u = await updatePart(p.id, { title: "b", note: "메모", assigneeUserId: null });
  expect([u.title, u.note, u.assigneeUserId]).toEqual(["b", "메모", null]);
});

test("reorderParts reorders; mismatched set is rejected and order kept", async () => {
  const { b, e } = await setup();
  const other = await createBook({ title: "다른", editorUserId: e.id });
  const a = await createPart({ bookId: b.id, title: "a" });
  const c = await createPart({ bookId: b.id, title: "c" });
  const o = await createPart({ bookId: other.id, title: "o" });
  await reorderParts(b.id, [c.id, a.id]);
  expect((await listParts(b.id)).map((p) => p.id)).toEqual([c.id, a.id]);
  for (const bad of [[c.id, o.id], [c.id], [c.id, c.id], [a.id, c.id, o.id]]) {
    await expect(reorderParts(b.id, bad)).rejects.toThrow("파트 목록이 맞지 않습니다.");
  }
  expect((await listParts(b.id)).map((p) => p.id)).toEqual([c.id, a.id]);
});

test("archived book rejects writes", async () => {
  const { b } = await setup();
  const p = await createPart({ bookId: b.id, title: "a" });
  await setBookStatus(b.id, "ARCHIVED");
  await expect(createPart({ bookId: b.id, title: "z" })).rejects.toThrow("보관된 책은 바꿀 수 없습니다.");
  await expect(updatePart(p.id, { title: "z" })).rejects.toThrow("보관된 책은 바꿀 수 없습니다.");
  await expect(reorderParts(b.id, [p.id])).rejects.toThrow("보관된 책은 바꿀 수 없습니다.");
});
