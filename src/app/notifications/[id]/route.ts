import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { openNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** 알림을 누르면: 읽음 표시하고 그 화면으로 보낸다. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const url = await openNotification(user.id, id);
  return NextResponse.redirect(new URL(url && url.startsWith("/") ? url : "/notifications", request.url));
}
