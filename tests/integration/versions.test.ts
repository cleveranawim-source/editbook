import { expect, test } from "vitest";
import { createUser } from "@/lib/users";
import { addMember, createBook, setBookStatus } from "@/lib/books";
import { createPart } from "@/lib/parts";
import {
  assertCanUpload,
  createVersion,
  findVersionByRef,
  getPartForViewer,
  latestVersionsByPart,
  listVersions,
} from "@/lib/versions";
import { resetDb } from "../helpers/db";

async function setup() {
  await resetDb();
  const e = await createUser({ loginId: "e1", name: "편집장", password: "temp-pass-1" });
  const w = await createUser({ loginId: "w1", name: "담당", password: "temp-pass-1" });
  const o = await createUser({ loginId: "o1", name: "다른교사", password: "temp-pass-1" });
  const x = await createUser({ loginId: "x1", name: "외부인", password: "temp-pass-1" });
  const b = await createBook({ title: "책", editorUserId: e.id });
  await addMember(b.id, w.id, "AUTHOR");
  await addMember(b.id, o.id, "AUTHOR");
  const p = await createPart({ bookId: b.id, title: "1장", assigneeUserId: w.id });
  return { e, w, o, x, b, p };
}

const file = (partId: string, name: string, extra?: Partial<Parameters<typeof createVersion>[0]>) => ({
  partId,
  uploadedById: "",
  originalRef: `local:${partId}/a/${name}`,
  originalName: name,
  originalSize: 1234,
  ...extra,
});

test("createVersion numbers from 1, trims note, derives pdf from a PDF original", async () => {
  const { w, p } = await setup();
  const v1 = await createVersion({ ...file(p.id, "1장.hwp"), uploadedById: w.id, note: " 초고 " });
  const v2 = await createVersion({ ...file(p.id, "1장.pdf"), uploadedById: w.id });
  expect([v1.number, v1.note, v1.pdfRef]).toEqual([1, "초고", null]);
  expect([v2.number, v2.pdfRef, v2.pdfName]).toEqual([2, v2.originalRef, "1장.pdf"]);
  const list = await listVersions(p.id);
  expect(list.map((v) => v.number)).toEqual([2, 1]);
  expect(list[0].uploadedBy?.name).toBe("담당");
});

test("createVersion keeps an explicit preview PDF next to a hwp original", async () => {
  const { w, p } = await setup();
  const v = await createVersion({
    ...file(p.id, "원고.hwpx"),
    uploadedById: w.id,
    pdfRef: `local:${p.id}/b/원고.pdf`,
    pdfName: "원고.pdf",
  });
  expect([v.pdfRef, v.pdfName]).toEqual([`local:${p.id}/b/원고.pdf`, "원고.pdf"]);
});

test("createVersion rejects bad extensions, bad sizes, missing part, archived book", async () => {
  const { w, b, p } = await setup();
  await expect(createVersion({ ...file(p.id, "원고.txt"), uploadedById: w.id })).rejects.toThrow("한글(hwp, hwpx)·워드(docx)·PDF");
  await expect(
    createVersion({ ...file(p.id, "원고.docx"), uploadedById: w.id, pdfRef: "local:x/y/z.docx", pdfName: "z.docx" }),
  ).rejects.toThrow("미리보기 파일은 PDF여야 합니다.");
  await expect(createVersion({ ...file(p.id, "원고.docx"), uploadedById: w.id, originalSize: 0 })).rejects.toThrow("빈 파일");
  await expect(
    createVersion({ ...file(p.id, "원고.docx"), uploadedById: w.id, originalSize: 101 * 1024 * 1024 }),
  ).rejects.toThrow("최대 100MB");
  await expect(createVersion({ ...file("nope", "원고.docx"), uploadedById: w.id })).rejects.toThrow("파트를 찾을 수 없습니다.");
  await setBookStatus(b.id, "ARCHIVED");
  await expect(createVersion({ ...file(p.id, "원고.docx"), uploadedById: w.id })).rejects.toThrow("보관된 책은 바꿀 수 없습니다.");
});

test("assertCanUpload: assignee and editor may upload, other teacher and outsider may not", async () => {
  const { e, w, o, x, p } = await setup();
  await expect(assertCanUpload(p.id, w)).resolves.toBeTruthy();
  await expect(assertCanUpload(p.id, e)).resolves.toBeTruthy();
  await expect(assertCanUpload(p.id, o)).rejects.toThrow("담당 선생님이나 편집장만");
  await expect(assertCanUpload(p.id, x)).rejects.toThrow("파트를 찾을 수 없습니다.");
  await expect(assertCanUpload("nope", w)).rejects.toThrow("파트를 찾을 수 없습니다.");
});

test("getPartForViewer: members and admins see the part, outsiders get null", async () => {
  const { o, x, p } = await setup();
  expect((await getPartForViewer(p.id, o))?.role).toBe("AUTHOR");
  expect((await getPartForViewer(p.id, { id: "admin", isAdmin: true }))?.role).toBeNull();
  expect(await getPartForViewer(p.id, x)).toBeNull();
  expect(await getPartForViewer("nope", o)).toBeNull();
});

test("latestVersionsByPart and findVersionByRef", async () => {
  const { w, b, p } = await setup();
  const p2 = await createPart({ bookId: b.id, title: "2장" });
  await createVersion({ ...file(p.id, "a.hwp"), uploadedById: w.id });
  const v2 = await createVersion({ ...file(p.id, "b.hwp"), uploadedById: w.id, pdfRef: "local:p/x/b.pdf", pdfName: "b.pdf" });
  const latest = await latestVersionsByPart(b.id);
  expect(latest.get(p.id)?.number).toBe(2);
  expect(latest.has(p2.id)).toBe(false);
  expect((await findVersionByRef("local:p/x/b.pdf"))?.id).toBe(v2.id);
  expect((await findVersionByRef(v2.originalRef))?.id).toBe(v2.id);
  expect(await findVersionByRef("local:nope")).toBeNull();
});
