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

let streamCheck: Promise<boolean> | null = null;

/**
 * 이 브라우저·인터넷 환경에서 "스트리밍 업로드"가 되는지 한 번 확인한다.
 * Blob 업로드 부품은 진행률을 보이려고 크롬의 스트리밍 업로드(fetch + ReadableStream)를 쓰는데,
 * 이것은 HTTP/2 연결에서만 된다. 학교망 보안 장비·백신(HTTPS 검사)·프록시가 연결을 HTTP/1.1로
 * 바꾸면 매번 "Failed to fetch"로 실패하고, 부품은 이를 연결 끊김으로 여겨 십여 분 재시도한다
 * (화면은 0%에 멈춘다). 안 되는 환경이면 진행률 없이 평범한 방식으로 올린다.
 */
export function canStreamUpload(): Promise<boolean> {
  streamCheck ??= (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new Uint8Array([0]));
          c.close();
        },
      });
      // 아무 HTTP 응답(권한 없음 403 포함)이라도 오면 스트리밍이 되는 것이다. 파일은 만들어지지 않는다.
      await fetch("https://vercel.com/api/blob/?pathname=editbook-probe.txt", {
        method: "PUT",
        body,
        signal: controller.signal,
        duplex: "half",
      } as RequestInit & { duplex: "half" });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  })();
  return streamCheck;
}

/**
 * Blob에 파일 하나를 올린다.
 * - 스트리밍이 되는 환경: 실제 진행률을 보이고, 진행이 STALL_MS 동안 멈추면 바로 실패로 끝낸다.
 * - 안 되는 환경: 진행률 없이 올린다. 화면이 멈춘 것처럼 보이지 않게 예상 진행률(최대 90%)을 보인다.
 */
export async function putToBlob(opts: {
  pathname: string;
  body: Blob;
  blobMode: BlobUploadMode;
  clientPayload: string;
  onProgress?: (pct: number) => void;
  /** 진행률을 실제로 잴 수 없는 환경이면 false로 한 번 알린다. */
  onMode?: (realProgress: boolean) => void;
}): Promise<string> {
  const put = opts.blobMode === "presigned" ? uploadPresigned : upload;
  const streaming = await canStreamUpload();
  opts.onMode?.(streaming);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ticker: ReturnType<typeof setInterval> | undefined;
  let lastPct = -1;
  let ping = () => {};
  // 스트리밍이 안 되면 진행 신호가 없으므로, 아주 느린 연결(초당 25KB)도 끝낼 수 있을 만큼 기다린다.
  const limitMs = streaming ? STALL_MS : 120_000 + (opts.body.size / 25_000) * 1000;
  const stalled = new Promise<never>((_, reject) => {
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(STALLED_MESSAGE));
      }, limitMs);
    };
    arm();
    ping = arm;
  });
  if (!streaming && opts.onProgress) {
    const started = Date.now();
    const tau = Math.max(5_000, (opts.body.size / 400_000) * 1000);
    opts.onProgress(0);
    ticker = setInterval(() => opts.onProgress?.(90 * (1 - Math.exp(-(Date.now() - started) / tau))), 1000);
  }
  try {
    const res = await Promise.race([
      put(opts.pathname, opts.body, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: opts.clientPayload,
        multipart: opts.body.size > 8 * 1024 * 1024,
        abortSignal: controller.signal,
        onUploadProgress: streaming
          ? (p) => {
              if (p.percentage > lastPct) {
                lastPct = p.percentage;
                ping();
              }
              opts.onProgress?.(p.percentage);
            }
          : undefined,
      }),
      stalled,
    ]);
    opts.onProgress?.(100);
    return res.url;
  } finally {
    clearTimeout(timer);
    clearInterval(ticker);
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
