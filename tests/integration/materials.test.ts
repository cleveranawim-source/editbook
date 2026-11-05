import { expect, test } from "vitest";
import { createUser } from "@/lib/users";
import { addMember, createBook, setBookStatus } from "@/lib/books";
import { createPart } from "@/lib/parts";
import { createFileMaterial, createLinkMaterial, deleteMaterial, isImageMaterial, listMaterials, materialCount } from "@/lib/materials";
import { findFileOwner } from "@/lib/file-index";
import { resetDb } from "../helpers/db";

async function setup() {
  await resetDb();
  const e = await createUser({ loginId: "e1", name: "편집장", password: "temp-pass-1" });
  const w = await createUser({ loginId: "w1", name: "담당", password: "temp-pass-1" });
  const o = await createUser({ loginId: "o1", name: "다른교사", password: "temp-pass-1" });
  const b = await createBook({ title: "책", editorUserId: e.id });
  await addMember(b.id, w.id, "AUTHOR");
  await addMember(b.id, o.id, "AUTHOR");
  const p = await createPart({ bookId: b.id, title: "1장", assigneeUserId: w.id });
  return { e, w, o, b, p };
}

test("assignee and editor add files and links; others cannot", async () => {
  const { e, w, o, p } = await setup();
  const f = await createFileMaterial(w, { partId: p.id, ref: "local:p/a/사진.jpg", name: " 사진.jpg ", size: 3 * 1024 * 1024 * 1024 - 1 > 0 ? 1234 : 1, contentType: "image/jpeg", thumbRef: "local:p/a/t.jpg" });
  expect([f.title, f.kind, Number(f.size)]).toEqual(["사진.jpg", "FILE", 1234]);
  expect(isImageMaterial(f)).toBe(true);
  const l = await createLinkMaterial(e, { partId: p.id, url: " https://drive.google.com/x ", title: "" });
  expect([l.kind, l.title, l.url]).toEqual(["LINK", "drive.google.com", "https://drive.google.com/x"]);
  expect(isImageMaterial(l)).toBe(false);
  await expect(createFileMaterial(o, { partId: p.id, ref: "local:p/b/x.pdf", name: "x.pdf", size: 1 })).rejects.toThrow("편집장과 이 파트 담당 선생님만");
  await expect(createLinkMaterial(w, { partId: p.id, url: "javascript:alert(1)", title: "x" })).rejects.toThrow("http 또는 https");
  await expect(createLinkMaterial(w, { partId: p.id, url: "not a url", title: "x" })).rejects.toThrow("주소가 올바르지");
  await expect(createFileMaterial(w, { partId: p.id, ref: "local:p/c/x", name: "x", size: 3 * 1024 * 1024 * 1024 })).rejects.toThrow("최대 2GB");
  await expect(createFileMaterial(w, { partId: p.id, ref: "local:p/c/x", name: "x", size: 0 })).rejects.toThrow("빈 파일");
  expect((await listMaterials(p.id)).map((m) => m.title)).toEqual(["drive.google.com", "사진.jpg"]);
  expect(await materialCount(p.id)).toBe(2);
  expect(await findFileOwner("local:p/a/사진.jpg")).toEqual({ partId: p.id, filename: "사진.jpg" });
  expect((await findFileOwner("local:p/a/t.jpg"))?.partId).toBe(p.id);
});

test("delete: uploader or editor only; archived book blocks", async () => {
  const { e, w, o, b, p } = await setup();
  const f = await createFileMaterial(w, { partId: p.id, ref: "local:p/a/a.pdf", name: "a.pdf", size: 10, thumbRef: null });
  const g = await createFileMaterial(e, { partId: p.id, ref: "local:p/a/b.pdf", name: "b.pdf", size: 10 });
  await expect(deleteMaterial(o, f.id)).rejects.toThrow("올린 사람이나 편집장만");
  await expect(deleteMaterial(w, g.id)).rejects.toThrow("올린 사람이나 편집장만");
  expect(await deleteMaterial(w, f.id)).toEqual({ partId: p.id, refs: ["local:p/a/a.pdf"] });
  await setBookStatus(b.id, "ARCHIVED");
  await expect(deleteMaterial(e, g.id)).rejects.toThrow("보관된 책");
  await expect(createLinkMaterial(e, { partId: p.id, url: "https://x.com", title: "x" })).rejects.toThrow("보관된 책");
});
