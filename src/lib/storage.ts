import { mkdir, readFile, writeFile } from "node:fs/promises";
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

/** Vercel인데 Blob 토큰이 없으면 "none": 서버 디스크에 쓸 수 없으므로 올리기를 막고 안내한다. */
export function storageKind(): StorageKind {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.VERCEL) return "none";
  return "local";
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

/** ref → 브라우저가 열 주소. download가 true면 첨부로 내려받게 한다. */
export function fileUrl(ref: string, opts?: { download?: boolean }): string {
  if (isLocalRef(ref)) {
    const base = `/api/files/${localKeyOf(ref).split("/").map(encodeURIComponent).join("/")}`;
    return opts?.download ? `${base}?download=1` : base;
  }
  if (opts?.download) {
    const u = new URL(ref);
    u.searchParams.set("download", "1");
    return u.toString();
  }
  return ref;
}
