import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { contentTypeFor } from "@/lib/files";
import { isLocalRef } from "@/lib/storage";
import { findFileOwner } from "@/lib/file-index";
import { getPartForViewer } from "@/lib/versions";

export const dynamic = "force-dynamic";

/**
 * Blob에 저장된 파일(원고·미리보기·자료·첨부)을 원래(한글) 이름으로 내려받게 한다. 책 참여자만.
 * Blob 경로는 영문·숫자뿐이라 그대로 받으면 이름이 "k3x9.hwp"처럼 되기 때문에 서버가 이름을 붙여 흘려보낸다.
 */
export async function GET(request: Request): Promise<Response> {
  const ref = new URL(request.url).searchParams.get("ref") ?? "";
  if (!ref || isLocalRef(ref) || !/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(ref)) {
    return new NextResponse("잘못된 요청입니다.", { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) return new NextResponse("로그인이 필요합니다.", { status: 401 });
  const owner = await findFileOwner(ref);
  if (!owner) return new NextResponse("파일이 없습니다.", { status: 404 });
  const view = await getPartForViewer(owner.partId, user);
  if (!view) return new NextResponse("파일이 없습니다.", { status: 404 });
  const filename = owner.filename;

  const upstream = await fetch(ref);
  if (!upstream.ok || !upstream.body) return new NextResponse("파일을 받지 못했습니다.", { status: 502 });
  const headers = new Headers({
    "Content-Type": contentTypeFor(filename),
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "private, no-store",
  });
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  return new Response(upstream.body, { headers });
}
