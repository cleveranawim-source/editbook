import { getCurrentUser } from "@/lib/auth/current";
import { unreadCount } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** 머리 줄 종 모양의 안 읽은 알림 수. */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ count: 0 }, { status: 401 });
  return Response.json({ count: await unreadCount(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
