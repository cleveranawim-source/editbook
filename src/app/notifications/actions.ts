"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/current";
import { markAllRead, notify, removePushSubscription, savePushSubscription } from "@/lib/notify";

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/notifications");
}

export async function subscribePushAction(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await savePushSubscription(user.id, sub, (await headers()).get("user-agent") ?? "");
    return { ok: true };
  } catch {
    return { ok: false, error: "푸시 구독을 저장하지 못했습니다." };
  }
}

export async function unsubscribePushAction(endpoint: string): Promise<void> {
  const user = await requireUser();
  await removePushSubscription(user.id, endpoint);
}

/** 내 기기로 시험 알림 한 통(알림함에도 남는다). */
export async function testPushAction(): Promise<void> {
  const user = await requireUser();
  await notify([user.id], { kind: "test", title: "EditBook 시험 알림", body: "이 기기에서 알림을 받을 수 있습니다.", url: "/notifications" });
  revalidatePath("/notifications");
}
