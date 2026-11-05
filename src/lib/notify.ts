import { prisma } from "@/lib/db";

/**
 * 알림: 앱 안 알림함에 한 줄 남기고, 그 사람이 푸시를 켜 둔 기기마다 웹 푸시를 보낸다.
 * 푸시는 실패해도 멈추지 않는다(알림함 기록이 기준). 보낸 사람 자신은 늘 뺀다.
 */

export type NotificationInput = { kind: string; title: string; body?: string; url: string };

const VAPID_KEY = "vapid";

type Vapid = { publicKey: string; privateKey: string };

let vapidCache: Vapid | null = null;

/** 웹 푸시 서버 키. 처음 쓸 때 만들어 DB에 두고 계속 쓴다(환경변수를 따로 넣지 않아도 되게). */
export async function getVapidKeys(): Promise<Vapid> {
  if (vapidCache) return vapidCache;
  const row = await prisma.appSetting.findUnique({ where: { key: VAPID_KEY } });
  if (row) return (vapidCache = JSON.parse(row.value) as Vapid);
  const webpush = (await import("web-push")).default;
  const keys = webpush.generateVAPIDKeys();
  try {
    await prisma.appSetting.create({ data: { key: VAPID_KEY, value: JSON.stringify(keys) } });
    return (vapidCache = keys);
  } catch {
    // 동시에 두 곳에서 만들었으면 먼저 저장된 것을 쓴다.
    const again = await prisma.appSetting.findUniqueOrThrow({ where: { key: VAPID_KEY } });
    return (vapidCache = JSON.parse(again.value) as Vapid);
  }
}

function excerpt(text: string, n = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** 여러 사람에게 같은 알림. 같은 사람이 두 번 들어 있거나 보낸 사람이면 뺀다. */
export async function notify(userIds: (string | null | undefined)[], n: NotificationInput, actorId?: string): Promise<number> {
  const targets = Array.from(new Set(userIds.filter((id): id is string => Boolean(id) && id !== actorId)));
  if (targets.length === 0) return 0;
  const body = excerpt(n.body ?? "");
  await prisma.notification.createMany({
    data: targets.map((userId) => ({ userId, kind: n.kind, title: n.title, body, url: n.url })),
  });
  await sendPush(targets, { title: n.title, body, url: n.url }).catch((e) => console.warn("[editbook] 푸시 실패", e));
  return targets.length;
}

async function sendPush(userIds: string[], payload: { title: string; body: string; url: string }): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  if (subs.length === 0) return;
  const webpush = (await import("web-push")).default;
  const { publicKey, privateKey } = await getVapidKeys();
  const subject = process.env.VAPID_SUBJECT || "mailto:editbook@example.com";
  const message = JSON.stringify(payload);
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message,
          { vapidDetails: { subject, publicKey, privateKey }, TTL: 60 * 60 * 24, timeout: 5000 },
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.id);
        else console.warn("[editbook] 푸시 한 건 실패", code ?? e);
      }
    }),
  );
  if (gone.length > 0) await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
}

/** 책의 편집장들(사람 id). */
export async function editorIds(bookId: string): Promise<string[]> {
  const rows = await prisma.bookMember.findMany({ where: { bookId, role: "EDITOR" }, select: { userId: true } });
  return rows.map((r) => r.userId);
}

export function partUrl(bookId: string, partId: string, opts?: { version?: number; request?: string }): string {
  const q = new URLSearchParams();
  if (opts?.version) q.set("v", String(opts.version));
  if (opts?.request) q.set("r", opts.request);
  const qs = q.toString();
  return `/books/${bookId}/parts/${partId}${qs ? `?${qs}` : ""}`;
}

export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent = "",
): Promise<void> {
  if (!/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error("잘못된 구독 정보");
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent.slice(0, 300) },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent.slice(0, 300) },
  });
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(userId: string, take = 100) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

/** 읽음 표시하고 갈 곳을 돌려준다. 남의 알림이면 null. */
export async function openNotification(userId: string, id: string): Promise<string | null> {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== userId) return null;
  if (!n.readAt) await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  return n.url;
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
