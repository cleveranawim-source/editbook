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

/** 저장 경로용 이름: 영문·숫자만 쓴다(한글 경로는 Vercel 서명 검사에서 깨진다). 원래 이름은 DB에 따로 남긴다. */
export function asciiKey(name: string): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extensionOf(name) || "bin"}`;
}

/** 이 크기까지는 올리기 전에 파일을 메모리에 복사해 둔다(그보다 크면 디스크에서 바로 읽는다). */
const COPY_LIMIT_BYTES = 300 * 1024 * 1024;

/**
 * 고른 파일을 메모리로 복사한다.
 * 고른 뒤 디스크의 파일이 바뀌면(한글에서 열어 둔 채 저장, 구글 드라이브 동기화 등) 크롬은 그 파일을
 * 다시 읽지 못하고, Blob 업로드 부품은 이를 "연결 끊김"으로 여겨 십여 분 동안 조용히 재시도한다
 * (화면에는 0%로 멈춘 것처럼 보인다). 처음 한 번 읽어 둔 내용으로 올리면 이 문제가 없다.
 */
export async function readIntoMemory(file: File): Promise<File> {
  if (file.size > COPY_LIMIT_BYTES) return file;
  try {
    const bytes = await file.arrayBuffer();
    return new File([bytes], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    throw new Error(
      `‘${file.name}’ 파일을 읽지 못했습니다. 한글 등에서 이 파일을 열어 두었다면 닫은 뒤, 파일을 다시 골라 주세요.`,
    );
  }
}

/** 이만큼 오래 한 바이트도 더 못 올리면 멈춘 것으로 보고 중단한다. */
const STALL_MS = 90_000;

export const STALLED_MESSAGE =
  "올리기가 멈춰서 중단했습니다. 인터넷 연결을 확인하고, 파일을 다시 골라 올려 주세요.";

/**
 * Blob에 파일 하나를 올린다. 진행이 STALL_MS 동안 멈추면 바로 실패로 끝낸다
 * (업로드 부품의 자동 재시도는 길게는 십여 분 기다리므로 그동안 화면이 멈춘 것처럼 보인다).
 */
export async function putToBlob(opts: {
  pathname: string;
  body: Blob;
  blobMode: BlobUploadMode;
  clientPayload: string;
  onProgress?: (pct: number) => void;
}): Promise<string> {
  const put = opts.blobMode === "presigned" ? uploadPresigned : upload;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastPct = -1;
  let ping = () => {};
  const stalled = new Promise<never>((_, reject) => {
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(STALLED_MESSAGE));
      }, STALL_MS);
    };
    arm();
    ping = arm;
  });
  try {
    const res = await Promise.race([
      put(opts.pathname, opts.body, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: opts.clientPayload,
        multipart: opts.body.size > 8 * 1024 * 1024,
        abortSignal: controller.signal,
        onUploadProgress: (p) => {
          if (p.percentage > lastPct) {
            lastPct = p.percentage;
            ping();
          }
          opts.onProgress?.(p.percentage);
        },
      }),
      stalled,
    ]);
    return res.url;
  } finally {
    clearTimeout(timer);
  }
}

async function putBlob(t: UploadTarget, body: Blob, name: string, onProgress?: (pct: number) => void): Promise<string> {
  const folder = t.purpose === "material" ? "materials" : "attachments";
  return putToBlob({
    pathname: `${folder}/${t.partId}/${asciiKey(name)}`,
    body,
    blobMode: t.blobMode,
    clientPayload: JSON.stringify({ partId: t.partId, purpose: t.purpose }),
    onProgress,
  });
}

export async function uploadFile(
  t: UploadTarget,
  file: File,
  opts?: { thumb?: Blob | null; onProgress?: (pct: number) => void },
): Promise<{ ref: string; thumbRef: string | null }> {
  if (t.storage === "blob") {
    const ref = await putBlob(t, await readIntoMemory(file), file.name, opts?.onProgress);
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
