import { expect, test } from "vitest";
import { prisma } from "@/lib/db";
import { createUser } from "@/lib/users";
import { addMember, createBook } from "@/lib/books";
import { createPart } from "@/lib/parts";
import { createVersion } from "@/lib/versions";
import { addComment, createRequest, notifyNewVersion, rerequest, resolveRequest } from "@/lib/requests";
import {
  getVapidKeys,
  listNotifications,
  markAllRead,
  notify,
  openNotification,
  removePushSubscription,
  savePushSubscription,
  unreadCount,
} from "@/lib/notify";
import { resetDb } from "../helpers/db";

async function setup() {
  await resetDb();
  await prisma.appSetting.deleteMany();
  const e = await createUser({ loginId: "e1", name: "편집장", password: "temp-pass-1" });
  const w = await createUser({ loginId: "w1", name: "담당", password: "temp-pass-1" });
  const o = await createUser({ loginId: "o1", name: "다른교사", password: "temp-pass-1" });
  const b = await createBook({ title: "책", editorUserId: e.id });
  await addMember(b.id, w.id, "AUTHOR");
  await addMember(b.id, o.id, "AUTHOR");
  const p = await createPart({ bookId: b.id, title: "1장", assigneeUserId: w.id });
  const v1 = await createVersion({
    partId: p.id, uploadedById: w.id, originalRef: `local:${p.id}/a/1.pdf`, originalName: "1.pdf", originalSize: 10,
  });
  return { e, w, o, b, p, v1 };
}
const rect = { page: 1, x: 0.1, y: 0.1, w: 0.3, h: 0.1 };
const titles = async (userId: string) => (await listNotifications(userId)).map((n) => n.title);

test("notify skips the actor and duplicates; read and mark-all work", async () => {
  const { e, w } = await setup();
  expect(await notify([w.id, w.id, e.id, null], { kind: "x", title: "t", body: "  a\n b ", url: "/books" }, e.id)).toBe(1);
  expect(await unreadCount(w.id)).toBe(1);
  expect(await unreadCount(e.id)).toBe(0);
  const [n] = await listNotifications(w.id);
  expect(n.body).toBe("a b");
  expect(await openNotification(e.id, n.id)).toBeNull();
  expect(await openNotification(w.id, n.id)).toBe("/books");
  expect(await unreadCount(w.id)).toBe(0);
  await notify([w.id], { kind: "x", title: "t2", url: "/" });
  await markAllRead(w.id);
  expect(await unreadCount(w.id)).toBe(0);
});

test("request flow notifies the right people", async () => {
  const { e, w, o, p, v1 } = await setup();
  const r = await createRequest(e, { partId: p.id, versionId: v1.id, ...rect, body: "고쳐 주세요" });
  expect(await titles(w.id)).toEqual(["「1장」 1번 수정 요청 · 편집장"]);
  expect((await listNotifications(w.id))[0].url).toBe(`/books/${p.bookId}/parts/${p.id}?v=1&r=${r.id}`);
  await addComment(w, r.id, "고쳤습니다");
  expect((await titles(e.id))[0]).toBe("「1장」 1번 요청에 응답 · 담당");
  await rerequest(e, r.id, "더");
  expect((await titles(w.id))[0]).toBe("「1장」 1번 재요청 · 편집장");
  await resolveRequest(e, r.id);
  expect((await titles(w.id))[0]).toBe("「1장」 1번 요청 확인 완료 · 편집장");
  const q = await createRequest(w, { partId: p.id, versionId: v1.id, ...rect, body: "질문" });
  expect((await titles(e.id))[0]).toBe("「1장」 2번 질문 · 담당");
  await addComment(e, q.id, "답");
  expect((await titles(w.id))[0]).toBe("「1장」 2번 질문에 답변 · 편집장");
  await addComment(w, q.id, "감사합니다");
  expect((await titles(e.id))[0]).toBe("「1장」 2번에 댓글 · 담당");
  expect(await titles(o.id)).toEqual([]);
});

test("notifyNewVersion goes to editors, not the uploader", async () => {
  const { e, w, p } = await setup();
  const v2 = await createVersion({
    partId: p.id, uploadedById: w.id, originalRef: "local:p/b/2.pdf", originalName: "2.pdf", originalSize: 10, note: "반영",
  });
  await notifyNewVersion(w, v2.id, 2);
  expect(await titles(e.id)).toEqual(["「1장」 v2 올라옴 · 담당 · 요청 2개 응답"]);
  expect(await titles(w.id)).toEqual([]);
});

test("VAPID keys are created once and push subscriptions are saved per endpoint", async () => {
  const { w, e } = await setup();
  const k1 = await getVapidKeys();
  const k2 = await getVapidKeys();
  expect(k1.publicKey).toBe(k2.publicKey);
  const sub = { endpoint: "https://push.example.com/abc", keys: { p256dh: "p", auth: "a" } };
  await savePushSubscription(w.id, sub, "UA");
  await savePushSubscription(e.id, sub, "UA2");
  const rows = await prisma.pushSubscription.findMany();
  expect(rows.map((r) => [r.userId, r.userAgent])).toEqual([[e.id, "UA2"]]);
  await expect(savePushSubscription(w.id, { endpoint: "http://x", keys: { p256dh: "p", auth: "a" } })).rejects.toThrow();
  await removePushSubscription(e.id, sub.endpoint);
  expect(await prisma.pushSubscription.count()).toBe(0);
});
