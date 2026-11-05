import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors";
import { safeFilename } from "@/lib/files";

export { contentTypeFor, extensionOf, safeFilename } from "@/lib/files";

/**
 * 파일 저장소. 운영(Vercel)은 Vercel Blob, 토큰이 없는 로컬 개발은 디스크(.uploads)를 쓴다.
 * DB에는 "저장 위치 표시자(ref)"만 둔다: Blob이면 https 주소, 로컬이면 "local:<키>".
 */
export type StorageKind = "blob" | "local" | "none";

export const LOCAL_PREFIX = "local:";

/**
 * Blob 자격: 읽기·쓰기 토큰(BLOB_READ_WRITE_TOKEN) 또는 프로젝트에 연결된 스토어(BLOB_STORE_ID + Vercel OIDC).
 * Vercel인데 둘 다 없으면 "none": 서버 디스크에 쓸 수 없으므로 올리기를 막고 안내한다.
 */
export function storageKind(): StorageKind {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return "blob";
  if (process.env.VERCEL) return "none";
  return "local";
}

/** 브라우저 직접 업로드 방식: 읽기·쓰기 토큰이 있으면 클라이언트 토큰, 아니면 프로젝트 연결(OIDC)의 presigned URL. */
export type BlobUploadMode = "token" | "presigned";
export function blobUploadMode(): BlobUploadMode {
  return process.env.BLOB_READ_WRITE_TOKEN ? "token" : "presigned";
}

export function uploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? ".uploads");
}

/** 로컬 키는 "파트id/시각-난수/파일명". 상위 디렉터리 탈출(.., 빈 조각)은 거부한다. */
export function assertSafeKey(key: string): void {
  const parts = key.split("/");
  if (parts.length < 2 || parts.some((p) => p === "" || p === "." || p === "..")) {
    throw new AppError("잘못된 파일 키입니다.");
  }
}

export function makeLocalKey(partId: string, filename: string): string {
  return `${partId}/${Date.now().toString(36)}-${randomBytes(4).toString("hex")}/${safeFilename(filename)}`;
}

export function isLocalRef(ref: string): boolean {
  return ref.startsWith(LOCAL_PREFIX);
}

export function localKeyOf(ref: string): string {
  return ref.slice(LOCAL_PREFIX.length);
}

export async function saveLocalFile(key: string, data: Uint8Array): Promise<string> {
  assertSafeKey(key);
  const full = path.join(uploadDir(), key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return LOCAL_PREFIX + key;
}

export async function readLocalFile(key: string): Promise<Buffer | null> {
  assertSafeKey(key);
  try {
    return await readFile(path.join(uploadDir(), key));
  } catch {
    return null;
  }
}

/**
 * ref → 브라우저가 열 주소. download가 true면 첨부로 내려받게 한다.
 * Blob 파일의 내려받기는 /api/download를 거쳐 원래(한글) 파일 이름을 붙인다. 미리보기는 Blob 주소를 바로 쓴다.
 */
export function fileUrl(ref: string, opts?: { download?: boolean }): string {
  if (isLocalRef(ref)) {
    const base = `/api/files/${localKeyOf(ref).split("/").map(encodeURIComponent).join("/")}`;
    return opts?.download ? `${base}?download=1` : base;
  }
  if (opts?.download) return `/api/download?ref=${encodeURIComponent(ref)}`;
  return ref;
}

/** 저장소에서 파일을 지운다. 실패해도 멈추지 않는다(DB 기록은 이미 지워졌으므로 고아 파일이 남을 뿐). */
export async function deleteStoredFiles(refs: string[]): Promise<void> {
  const blobs = refs.filter((r) => !isLocalRef(r));
  for (const ref of refs.filter(isLocalRef)) {
    try {
      const key = localKeyOf(ref);
      assertSafeKey(key);
      await rm(path.join(uploadDir(), key), { force: true });
    } catch (e) {
      console.warn("[editbook] 로컬 파일 삭제 실패", ref, e);
    }
  }
  if (blobs.length > 0 && storageKind() === "blob") {
    try {
      const { del } = await import("@vercel/blob");
      await del(blobs);
    } catch (e) {
      console.warn("[editbook] Blob 파일 삭제 실패", blobs, e);
    }
  }
}
