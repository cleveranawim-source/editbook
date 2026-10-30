import { expect, test } from "vitest";
import { createUser } from "@/lib/users";
import {
  addMember, createBook, getBookForViewer, getBookSummary, listBooksForUser, setBookStatus,
} from "@/lib/books";
import { createPart } from "@/lib/parts";
import { resetDb } from "../helpers/db";

async function user(id: string, name = id) {
  return createUser({ loginId: id, name, password: "temp-pass-1" });
}

test("listBooksForUser orders ACTIVE first by newest, aggregates counts", async () => {
  await resetDb();
  const e = await user("e1", "김편집");
  const w = await user("w1", "박교사");
  const other = await user("o1");
  const old = await createBook({ title: "옛 책", editorUserId: e.id });
  const archived = await createBook({ title: "보관 책", editorUserId: e.id });
  const recent = await createBook({ title: "새 책", editorUserId: e.id });
  await createBook({ title: "남의 책", editorUserId: other.id });
  await addMember(recent.id, w.id, "AUTHOR");
  await createPart({ bookId: recent.id, title: "1장" });
  await createPart({ bookId: recent.id, title: "2장" });
  await setBookStatus(archived.id, "ARCHIVED");

  const list = await listBooksForUser(e.id);
  expect(list.map((x) => x.book.title)).toEqual(["새 책", "옛 책", "보관 책"]);
  const first = list[0];
  expect(first.role).toBe("EDITOR");
  expect(first.editorNames).toEqual(["김편집"]);
  expect(first.memberCount).toBe(2);
  expect(first.partCount).toBe(2);
  expect(list[1].memberCount).toBe(1);
  expect(list[1].partCount).toBe(0);
  expect(old.id).toBe(list[1].book.id);

  const mine = await listBooksForUser(w.id);
  expect(mine).toHaveLength(1);
  expect(mine[0].role).toBe("AUTHOR");
});

test("getBookForViewer: null for non-member, role for member, admin sees any", async () => {
  await resetDb();
  const e = await user("e1");
  const x = await user("x1");
  const b = await createBook({ title: "책", editorUserId: e.id });
  expect(await getBookForViewer(b.id, { id: x.id, isAdmin: false })).toBeNull();
  expect(await getBookForViewer("nope", { id: e.id, isAdmin: false })).toBeNull();
  const m = await getBookForViewer(b.id, { id: e.id, isAdmin: false });
  expect(m?.role).toBe("EDITOR");
  const a = await getBookForViewer(b.id, { id: x.id, isAdmin: true });
  expect(a?.book.id).toBe(b.id);
  expect(a?.role).toBeNull();
});

test("getBookSummary: editor names sorted, teacher and part counts, null for unknown book", async () => {
  await resetDb();
  const e = await user("e1", "하편집");
  const e2 = await user("e2", "가편집");
  const w1 = await user("w1", "박교사");
  const w2 = await user("w2", "최교사");
  const b = await createBook({ title: "책", editorUserId: e.id });
  await addMember(b.id, e2.id, "EDITOR");
  await addMember(b.id, w1.id, "AUTHOR");
  await addMember(b.id, w2.id, "AUTHOR");
  await createPart({ bookId: b.id, title: "1장" });

  expect(await getBookSummary(b.id)).toEqual({
    editorNames: ["가편집", "하편집"],
    teacherCount: 2,
    partCount: 1,
  });
  expect(await getBookSummary("nope")).toBeNull();
});
