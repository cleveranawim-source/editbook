import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { AppError } from "@/lib/errors";
import { makeLocalKey, saveLocalFile, storageKind } from "@/lib/storage";
import { assertCanUpload, assertFileSize, assertOriginalName, assertPdfName } from "@/lib/versions";

export const dynamic = "force-dynamic";

/**
 * 로컬 디스크 저장 방식(Blob 토큰 없음)일 때의 업로드. 파일을 받아 .uploads에 쓰고
 * 저장 위치 표시자를 돌려준다. 버전 기록은 브라우저가 서버 액션으로 남긴다.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (storageKind() !== "local") return NextResponse.json({ error: "지원하지 않습니다." }, { status: 404 });
  try {
    const user = await getCurrentUser();
    if (!user || user.mustChangePassword) throw new AppError("로그인이 필요합니다.");
    const form = await request.formData();
    const partId = String(form.get("partId") ?? "");
    await assertCanUpload(partId, user);
    const original = form.get("original");
    if (!(original instanceof File)) throw new AppError("원고 파일을 고르세요.");
    assertOriginalName(original.name);
    assertFileSize(original.size);
    const pdf = form.get("pdf");
    const hasPdf = pdf instanceof File && pdf.size > 0;
    if (hasPdf) {
      assertPdfName(pdf.name);
      assertFileSize(pdf.size);
    }
    const originalRef = await saveLocalFile(
      makeLocalKey(partId, original.name),
      new Uint8Array(await original.arrayBuffer()),
    );
    const pdfRef = hasPdf
      ? await saveLocalFile(makeLocalKey(partId, pdf.name), new Uint8Array(await pdf.arrayBuffer()))
      : null;
    return NextResponse.json({ originalRef, pdfRef });
  } catch (e) {
    const message = e instanceof AppError ? e.message : "업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
