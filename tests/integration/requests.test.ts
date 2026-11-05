import { expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { createUser } from "@/lib/users";
import { addMember, createBook, setBookStatus } from "@/lib/books";
import { createPart } from "@/lib/parts";
import { createVersion, deleteVersion } from "@/lib/versions";
import {
  addComment,
  createRequest,
  listRequestViews,
  perspectiveOf,
  requestCountsByPart,
  rerequest,
  resolveRequest,
  respondWithVersion,
  setPartComplete,
} from "@/lib/requests";
import { resetDb } from "../helpers/db";

async function setup() {
  await resetDb();
  const e = await createUser({ loginId: "e1", name: "편집장", password: "temp-pass-1" });
  const w = await createUser({ loginId: "w1", name: "담당", password: "temp-pass-1" });
  const o = await createUser({ loginId: "o1", name: "다른교사", password: "temp-pass-1" });
  const admin = { id: "admin-x", isAdmin: true };
  const b = await createBook({ title: "책", editorUserId: e.id });
  await addMember(b.id, w.id, "AUTHOR");
  await addMember(b.id, o.id, "AUTHOR");
  const p = await createPart({ bookId: b.id, title: "1장", assigneeUserId: w.id });
  const v1 = await createVersion({
    partId: p.id,
    uploadedById: w.id,
    originalRef: `local:${p.id}/a/1.hwp`,
    originalName: "1.hwp",
    originalSize: 10,
    pdfRef: `local:${p.id}/a/1.pdf`,
    pdfName: "1.pdf",
  });
  return { e, w, o, admin, b, p, v1 };
}

const rect = { page: 2, x: 0.1, y: 0.2, w: 0.3, h: 0.1 };

test("perspectiveOf: editor, admin, assignee, other", async () => {
  const { e, w, o, p } = await setup();
  const part = await prisma.part.findUniqueOrThrow({ where: { id: p.id } });
  expect(perspectiveOf(e, { role: "EDITOR", part })).toBe("editor");
  expect(perspectiveOf({ id: "z", isAdmin: true }, { role: null, part })).toBe("editor");
  expect(perspectiveOf(w, { role: "AUTHOR", part })).toBe("author");
  expect(perspectiveOf(o, { role: "AUTHOR", part })).toBe("other");
});

test("editor makes a numbered REQUEST, assignee makes a QUESTION, others cannot", async () => {
  const { e, w, o, p, v1 } = await setup();
  const r1 = await createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: " 오타 " });
  const r2 = await createRequest(w, { partId: p.id, versionId: v1.id, ...rect, body: "이 표 빼도 될까요?" });
  expect([r1.number, r1.kind, r1.status, r1.body, r1.page]).toEqual([1, "REQUEST", "OPEN", "오타", 2]);
  expect([r2.number, r2.kind]).toEqual([2, "QUESTION"]);
  await expect(createRequest(o, { partId: p.id, versionId: v1.id, ...rect, body: "x" })).rejects.toThrow(
    "편집장과 이 파트 담당 선생님만",
  );
});

test("createRequest validates body, size, version and preview PDF", async () => {
  const { e, w, p, v1 } = await setup();
  await expect(createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: "  " })).rejects.toThrow("내용을 적어");
  await expect(createRequest(e, { partId: p.id, versionId: v1.id, ...rect, w: 0.001, body: "a" })).rejects.toThrow("너무 작습니다");
  await expect(createRequest(e, { partId: p.id, versionId: "nope", ...rect, body: "a" })).rejects.toThrow("버전을 찾을 수 없습니다");
  const v2 = await createVersion({ partId: p.id, uploadedById: w.id, originalRef: "local:p/b/2.docx", originalName: "2.docx", originalSize: 10 });
  await expect(createRequest(e, { partId: p.id, versionId: v2.id, ...rect, body: "a" })).rejects.toThrow("미리보기 PDF가 있는 버전");
  const clamped = await createRequest(e, { partId: p.id, versionId: v1.id, page: 1, x: 0.9, y: -1, w: 0.5, h: 0.5, body: "끝" });
  expect([clamped.x, clamped.y, clamped.w, clamped.h]).toEqual([0.9, 0, expect.closeTo(0.1, 5), 0.5]);
});

test("request flow: assignee reply → RESPONDED, editor rerequest → OPEN, resolve → RESOLVED", async () => {
  const { e, w, o, p, v1 } = await setup();
  const r = await createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: "고쳐 주세요" });
  await addComment(e, r.id, "참고로 2쪽도");
  expect((await prisma.editRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("OPEN");
  await addComment(w, r.id, "고쳤습니다");
  expect((await prisma.editRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("RESPONDED");
  await expect(addComment(o, r.id, "x")).rejects.toThrow("편집장과 이 파트 담당 선생님만");
  await expect(rerequest(w, r.id, "x")).rejects.toThrow("편집장만 재요청");
  await expect(rerequest(e, r.id, " ")).rejects.toThrow("내용을 적어");
  await rerequest(e, r.id, "한 군데 더");
  expect((await prisma.editRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("OPEN");
  await expect(rerequest(e, r.id, "또")).rejects.toThrow("재요청할 수 없는 상태");
  await expect(resolveRequest(w, r.id)).rejects.toThrow("편집장만 확인 완료");
  await resolveRequest(e, r.id);
  expect((await prisma.editRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("RESOLVED");
  await expect(resolveRequest(e, r.id)).rejects.toThrow("확인 완료할 수 없는 상태");
  const [view] = await listRequestViews(p.id);
  expect(view.comments.map((c) => c.action)).toEqual(["NOTE", "RESPOND", "REREQUEST", "RESOLVE"]);
  expect(view.versionNumber).toBe(1);
  expect(view.authorName).toBe("편집장");
});

test("question flow: editor reply → ANSWERED; assignee follow-up stays ANSWERED", async () => {
  const { e, w, p, v1 } = await setup();
  const q = await createRequest(w, { partId: p.id, versionId: v1.id, ...rect, body: "질문" });
  await addComment(w, q.id, "덧붙임");
  expect((await prisma.editRequest.findUniqueOrThrow({ where: { id: q.id } })).status).toBe("OPEN");
  await addComment(e, q.id, "네 빼셔도 됩니다");
  expect((await prisma.editRequest.findUniqueOrThrow({ where: { id: q.id } })).status).toBe("ANSWERED");
  await expect(resolveRequest(e, q.id)).rejects.toThrow("확인 완료할 수 없는 상태");
});

test("respondWithVersion marks only this part's open REQUESTs and records the version", async () => {
  const { e, w, b, p, v1 } = await setup();
  const other = await createPart({ bookId: b.id, title: "2장", assigneeUserId: w.id });
  const r1 = await createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: "a" });
  const r2 = await createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: "b" });
  const q = await createRequest(w, { partId: p.id, versionId: v1.id, ...rect, body: "q" });
  await resolveRequest(e, r2.id);
  const v2 = await createVersion({ partId: p.id, uploadedById: w.id, originalRef: "local:p/c/2.pdf", originalName: "2.pdf", originalSize: 10 });
  const n = await respondWithVersion(w, p.id, v2.id, [r1.id, r2.id, q.id, "nope"]);
  expect(n).toBe(1);
  const views = await listRequestViews(p.id);
  expect(views.map((v) => v.status)).toEqual(["RESPONDED", "RESOLVED", "OPEN"]);
  expect(views[0].comments.at(-1)).toMatchObject({ action: "RESPOND", versionNumber: 2, body: "v2에 반영했습니다." });
  expect(await respondWithVersion(w, other.id, v2.id, [r1.id])).toBe(0);
  expect(await respondWithVersion(w, p.id, v2.id, [])).toBe(0);
});

test("requestCountsByPart: open requests vs awaiting review", async () => {
  const { e, w, p, v1 } = await setup();
  const r1 = await createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: "a" });
  await createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: "b" });
  await createRequest(w, { partId: p.id, versionId: v1.id, ...rect, body: "q" });
  await addComment(w, r1.id, "done");
  const c = await requestCountsByPart([p.id, "missing"]);
  expect(c.get(p.id)).toEqual({ openRequests: 1, awaitingReview: 2 });
  expect(c.get("missing")).toEqual({ openRequests: 0, awaitingReview: 0 });
  expect((await requestCountsByPart([])).size).toBe(0);
});

test("setPartComplete marks the latest version; a new version clears it implicitly", async () => {
  const { e, w, p, v1 } = await setup();
  await expect(setPartComplete(w, p.id, true)).rejects.toThrow("편집장만 완료");
  await setPartComplete(e, p.id, true);
  expect((await prisma.part.findUniqueOrThrow({ where: { id: p.id } })).completedVersionId).toBe(v1.id);
  await setPartComplete(e, p.id, false);
  expect((await prisma.part.findUniqueOrThrow({ where: { id: p.id } })).completedVersionId).toBeNull();
});

test("deleteVersion: editor/admin only, blocked when requests exist, clears completion", async () => {
  const { e, w, admin, p, v1 } = await setup();
  const v2 = await createVersion({ partId: p.id, uploadedById: w.id, originalRef: "local:p/d/2.pdf", originalName: "2.pdf", originalSize: 10 });
  await setPartComplete(e, p.id, true);
  await expect(deleteVersion(v2.id, w)).rejects.toThrow("편집장만 버전을 지울");
  const out = await deleteVersion(v2.id, admin);
  expect(out.refs).toEqual(["local:p/d/2.pdf"]);
  expect((await prisma.part.findUniqueOrThrow({ where: { id: p.id } })).completedVersionId).toBeNull();
  await createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: "a" });
  await expect(deleteVersion(v1.id, e)).rejects.toThrow("요청 1개가 달린 버전");
  await expect(deleteVersion("nope", e)).rejects.toThrow("버전을 찾을 수 없습니다");
});

test("archived book blocks all request writes", async () => {
  const { e, w, b, p, v1 } = await setup();
  const r = await createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: "a" });
  await setBookStatus(b.id, "ARCHIVED");
  await expect(createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: "a" })).rejects.toThrow("보관된 책");
  await expect(addComment(w, r.id, "x")).rejects.toThrow("보관된 책");
  await expect(resolveRequest(e, r.id)).rejects.toThrow("보관된 책");
});

test("turnSummaryForBooks: teacher and editor see opposite turns", async () => {
  const { e, w, b, p, v1 } = await setup();
  const { turnSummaryForBooks } = await import("@/lib/requests");
  await createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: "a" });
  expect((await turnSummaryForBooks(w, new Map([[b.id, "AUTHOR"]]))).get(b.id)).toEqual({ mine: 1, theirs: 0 });
  expect((await turnSummaryForBooks(e, new Map([[b.id, "EDITOR"]]))).get(b.id)).toEqual({ mine: 0, theirs: 1 });
  expect((await turnSummaryForBooks(e, new Map())).size).toBe(0);
});
