import { issueSignedToken } from "@vercel/blob";
import {
  handleUpload,
  handleUploadPresigned,
  type HandleUploadBody,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { AppError } from "@/lib/errors";
import { MAX_ATTACHMENT_BYTES, MAX_FILE_BYTES, MAX_MATERIAL_BYTES, type UploadPurpose } from "@/lib/files";
import { assertCanAddMaterial } from "@/lib/materials";
import { blobUploadMode, storageKind } from "@/lib/storage";
import { assertCanUpload, assertOriginalName } from "@/lib/versions";

export const dynamic = "force-dynamic";

const ONE_HOUR = 60 * 60 * 1000;

/** 올릴 권한이 있는지 확인한 뒤 파트 id와 크기 한도를 돌려준다. */
async function authorize(pathname: string, clientPayload: string | null): Promise<{ partId: string; max: number }> {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) throw new AppError("로그인이 필요합니다.");
  const payload = JSON.parse(clientPayload ?? "{}") as { partId?: string; purpose?: UploadPurpose };
  if (!payload.partId) throw new AppError("파트 정보가 없습니다.");
  const purpose = payload.purpose ?? "version";
  if (purpose === "material" || purpose === "attachment") {
    await assertCanAddMaterial(payload.partId, user);
    return { partId: payload.partId, max: purpose === "material" ? MAX_MATERIAL_BYTES : MAX_ATTACHMENT_BYTES };
  }
  await assertCanUpload(payload.partId, user);
  assertOriginalName(pathname);
  return { partId: payload.partId, max: MAX_FILE_BYTES };
}

/**
 * Vercel Blob 직접 업로드 준비. 브라우저가 파일을 Blob에 바로 올리므로 서버 함수의
 * 요청 크기 제한(4.5MB)에 걸리지 않는다. 버전 기록은 업로드가 끝난 뒤 브라우저가
 * 서버 액션(createVersionAction)으로 따로 남긴다.
 *
 * - 읽기·쓰기 토큰(BLOB_READ_WRITE_TOKEN)이 있으면: 클라이언트 토큰 발급(handleUpload)
 * - 프로젝트에 연결된 스토어(BLOB_STORE_ID + Vercel OIDC)면: presigned URL 발급(handleUploadPresigned)
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (storageKind() !== "blob") {
    return NextResponse.json({ error: "Blob 저장소가 설정되지 않았습니다." }, { status: 404 });
  }
  const body = (await request.json()) as HandleUploadBody | HandleUploadPresignedBody;
  try {
    if (blobUploadMode() === "presigned") {
      const json = await handleUploadPresigned({
        body: body as HandleUploadPresignedBody,
        request,
        getSignedToken: async (pathname, clientPayload) => {
          const { partId, max } = await authorize(pathname, clientPayload);
          const token = await issueSignedToken({
            pathname,
            operations: ["put"],
            maximumSizeInBytes: max,
            validUntil: Date.now() + ONE_HOUR,
          });
          return {
            token,
            urlOptions: {
              addRandomSuffix: true,
              maximumSizeInBytes: max,
              validUntil: Date.now() + ONE_HOUR,
              tokenPayload: JSON.stringify({ partId }),
            },
          };
        },
      });
      return NextResponse.json(json);
    }
    const json = await handleUpload({
      body: body as HandleUploadBody,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { partId, max } = await authorize(pathname, clientPayload);
        return {
          maximumSizeInBytes: max,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ partId }),
        };
      },
      // 로컬에서는 콜백이 오지 않으므로 여기에 기대지 않는다. 기록은 서버 액션이 한다.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    const message = e instanceof AppError ? e.message : `업로드 준비에 실패했습니다. ${e instanceof Error ? e.message : ""}`;
    return NextResponse.json({ error: message.trim() }, { status: 400 });
  }
}
