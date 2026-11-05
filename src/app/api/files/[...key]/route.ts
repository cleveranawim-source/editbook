import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { AppError } from "@/lib/errors";
import { contentTypeFor, LOCAL_PREFIX, readLocalFile } from "@/lib/storage";
import { findFileOwner } from "@/lib/file-index";
import { getPartForViewer } from "@/lib/versions";

export const dynamic = "force-dynamic";

/** 로컬 디스크에 저장된 파일을 책 참여자에게만 내준다. ?download=1 이면 첨부로. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<NextResponse> {
  const { key: segments } = await params;
  const key = segments.map(decodeURIComponent).join("/");
  const user = await getCurrentUser();
  if (!user) return new NextResponse("로그인이 필요합니다.", { status: 401 });
  const owner = await findFileOwner(LOCAL_PREFIX + key);
  if (!owner) return new NextResponse("파일이 없습니다.", { status: 404 });
  const view = await getPartForViewer(owner.partId, user);
  if (!view) return new NextResponse("파일이 없습니다.", { status: 404 });
  let data: Buffer | null;
  try {
    data = await readLocalFile(key);
  } catch (e) {
    if (e instanceof AppError) return new NextResponse(e.message, { status: 400 });
    throw e;
  }
  if (!data) return new NextResponse("파일이 없습니다.", { status: 404 });
  const filename = owner.filename;
  const download = new URL(request.url).searchParams.get("download") === "1";
  const disposition = `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename)}`;
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeFor(filename),
      "Content-Length": String(data.byteLength),
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}
