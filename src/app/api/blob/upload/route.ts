import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { AppError } from "@/lib/errors";
import { storageKind } from "@/lib/storage";
import { MAX_FILE_BYTES } from "@/lib/files";
import { assertCanUpload, assertOriginalName } from "@/lib/versions";

export const dynamic = "force-dynamic";

/**
 * Vercel Blob 직접 업로드용 토큰 발급. 브라우저가 파일을 Blob에 바로 올리므로
 * 서버 함수의 요청 크기 제한(4.5MB)에 걸리지 않는다. 버전 기록은 업로드가 끝난 뒤
 * 브라우저가 서버 액션(createVersionAction)으로 따로 남긴다.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (storageKind() !== "blob") {
    return NextResponse.json({ error: "Blob 저장소가 설정되지 않았습니다." }, { status: 404 });
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getCurrentUser();
        if (!user || user.mustChangePassword) throw new AppError("로그인이 필요합니다.");
        const payload = JSON.parse(clientPayload ?? "{}") as { partId?: string };
        if (!payload.partId) throw new AppError("파트 정보가 없습니다.");
        await assertCanUpload(payload.partId, user);
        assertOriginalName(pathname);
        return {
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ partId: payload.partId, userId: user.id }),
        };
      },
      // 로컬에서는 콜백이 오지 않으므로 여기에 기대지 않는다. 기록은 서버 액션이 한다.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    const message = e instanceof AppError ? e.message : "업로드 준비에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
