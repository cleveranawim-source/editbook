/**
 * 브라우저에서 파일 하나를 저장소에 올린다(자료함·댓글 첨부용).
 * Blob 방식이면 브라우저가 Blob에 바로(큰 파일은 조각으로 나눠) 올리고, 로컬 방식이면 /api/upload로 보낸다.
 */
import { upload, uploadPresigned } from "@vercel/blob/client";
import { extensionOf, type UploadPurpose } from "@/lib/files";
import type { BlobUploadMode, StorageKind } from "@/lib/storage";

export type UploadTarget = {
  partId: string;
  purpose: Exclude<UploadPurpose, "version">;
  storage: Exclude<StorageKind, "none">;
  blobMode: BlobUploadMode;
};

function asciiKey(name: string): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extensionOf(name) || "bin"}`;
}

async function putBlob(t: UploadTarget, body: Blob, name: string, onProgress?: (pct: number) => void): Promise<string> {
  const put = t.blobMode === "presigned" ? uploadPresigned : upload;
  const folder = t.purpose === "material" ? "materials" : "attachments";
  const res = await put(`${folder}/${t.partId}/${asciiKey(name)}`, body, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
    clientPayload: JSON.stringify({ partId: t.partId, purpose: t.purpose }),
    multipart: body.size > 8 * 1024 * 1024,
    onUploadProgress: (p) => onProgress?.(p.percentage),
  });
  return res.url;
}

export async function uploadFile(
  t: UploadTarget,
  file: File,
  opts?: { thumb?: Blob | null; onProgress?: (pct: number) => void },
): Promise<{ ref: string; thumbRef: string | null }> {
  if (t.storage === "blob") {
    const ref = await putBlob(t, file, file.name, opts?.onProgress);
    const thumbRef = opts?.thumb ? await putBlob(t, opts.thumb, "thumb.jpg") : null;
    return { ref, thumbRef };
  }
  const form = new FormData();
  form.set("partId", t.partId);
  form.set("purpose", t.purpose);
  form.set("file", file);
  if (opts?.thumb) form.set("thumb", new File([opts.thumb], "thumb.jpg", { type: "image/jpeg" }));
  opts?.onProgress?.(10);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = (await res.json()) as { ref?: string; thumbRef?: string | null; error?: string };
  if (!res.ok || !json.ref) throw new Error(json.error ?? "올리지 못했습니다.");
  opts?.onProgress?.(100);
  return { ref: json.ref, thumbRef: json.thumbRef ?? null };
}

/** 사진이면 긴 변 480px짜리 JPEG 미리보기를 만든다. 못 읽는 형식(HEIC 등)이나 너무 크면 null. */
export async function makeThumbnail(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("image/") || file.size > 60 * 1024 * 1024) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82));
  } catch {
    return null;
  }
}
