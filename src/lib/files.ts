/** 파일 이름·확장자 규칙. 서버와 브라우저가 같이 쓰므로 Node 전용 모듈을 들이지 않는다. */

export const ORIGINAL_EXTENSIONS = ["hwp", "hwpx", "docx", "pdf"] as const;
export const ORIGINAL_ACCEPT = ".hwp,.hwpx,.docx,.pdf";
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

export function isOriginalName(name: string): boolean {
  return (ORIGINAL_EXTENSIONS as readonly string[]).includes(extensionOf(name));
}

/** 파일 이름에서 경로 구분자·제어 문자를 걷어내고 길이를 줄인다. 한글은 그대로 둔다. */
export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = Array.from(base)
    .filter((ch) => ch.charCodeAt(0) >= 32 && ch !== "\u007f")
    .join("")
    .replace(/^\.+/, "")
    .trim();
  const out = cleaned || "file";
  return out.length > 150 ? out.slice(out.length - 150) : out;
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  hwp: "application/x-hwp",
  hwpx: "application/hwp+zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  zip: "application/zip",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  txt: "text/plain; charset=utf-8",
};

export function contentTypeFor(name: string): string {
  return CONTENT_TYPES[extensionOf(name)] ?? "application/octet-stream";
}

export function formatBytes(n: number): string {
  if (n <= 0) return "0KB";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))}KB`;
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)}MB`;
}

/** 올리는 목적별 크기 한도. */
export const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;
export const MAX_MATERIAL_BYTES = 2 * 1024 * 1024 * 1024;
export type UploadPurpose = "version" | "material" | "attachment";
