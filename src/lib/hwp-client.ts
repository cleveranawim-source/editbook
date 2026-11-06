/**
 * 브라우저에서 한글(hwp, hwpx) 파일을 그리는 쪽 코드. rhwp(@rhwp/core, Rust→wasm)를 쓴다.
 * 서버에서는 불러오지 않는다(클라이언트 컴포넌트에서만 import).
 */
import type { HwpDocument } from "@rhwp/core";

type Rhwp = typeof import("@rhwp/core");

let loading: Promise<Rhwp> | null = null;

/** wasm을 한 번만 내려받아 준비한다. 글자 폭 재기는 rhwp가 요구하는 전역 함수. */
export function loadRhwp(): Promise<Rhwp> {
  if (!loading) {
    loading = (async () => {
      let ctx: CanvasRenderingContext2D | null = null;
      let lastFont = "";
      (globalThis as { measureTextWidth?: (font: string, text: string) => number }).measureTextWidth = (font, text) => {
        if (!ctx) ctx = document.createElement("canvas").getContext("2d");
        if (!ctx) return text.length * 8;
        if (font !== lastFont) {
          ctx.font = font;
          lastFont = font;
        }
        return ctx.measureText(text).width;
      };
      const mod = await import("@rhwp/core");
      await mod.default({ module_or_path: "/vendor/rhwp_bg.wasm" });
      return mod;
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export async function openHwp(bytes: Uint8Array): Promise<HwpDocument> {
  const mod = await loadRhwp();
  return new mod.HwpDocument(bytes);
}

export function isHwpName(name: string): boolean {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return ext === "hwp" || ext === "hwpx";
}

/** 캔버스 한 장을 흰 바탕 JPEG로. 한글 렌더 결과가 투명 바탕이어도 검게 되지 않게. */
async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  const white = document.createElement("canvas");
  white.width = canvas.width;
  white.height = canvas.height;
  const ctx = white.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, white.width, white.height);
  ctx.drawImage(canvas, 0, 0);
  try {
    const blob = await new Promise<Blob>((resolve, reject) =>
      white.toBlob((b) => (b ? resolve(b) : reject(new Error("jpeg"))), "image/jpeg", 0.88),
    );
    return await blob.arrayBuffer();
  } finally {
    white.width = white.height = 0; // 큰 캔버스 메모리를 바로 돌려준다
  }
}

/** rhwp는 오류를 문자열 등 아무 값으로 던진다. 사람이 읽을 문장으로 바꾼다. */
export function errorText(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return "알 수 없는 오류";
}

/** 미리보기를 못 만든 이유를 선생님이 알아들을 말로. 자세한 내용은 개발자 도구 콘솔에 남긴다. */
export function previewFailureReason(e: unknown): string {
  const raw = errorText(e);
  console.warn("[editbook] 미리보기 변환 실패:", raw);
  if (/password|암호|비밀번호/i.test(raw)) return "비밀번호가 걸린 문서입니다";
  if (/너무 커/.test(raw)) return "미리보기 PDF가 100MB를 넘습니다";
  if (/unreachable|memory|out of bounds/i.test(raw)) return "문서가 너무 길거나 그림이 많아 브라우저 메모리가 모자랍니다";
  if (/시그니처|signature|유효하지 않은|invalid/i.test(raw)) return "한글 파일 형식을 읽지 못했습니다";
  return "이 파일은 자동 변환이 되지 않습니다";
}

/** 쪽 수가 많을수록 해상도를 낮춰 메모리와 PDF 크기를 줄인다. */
function scaleFor(pages: number): number {
  if (pages <= 60) return 2;
  if (pages <= 150) return 1.5;
  return 1.2;
}

/**
 * 한글 파일 → 미리보기 PDF(쪽마다 그림). 글자 검색은 안 되지만 모두가 같은 쪽·같은 자리를 본다.
 * scale 2 = 192dpi 정도(긴 문서는 낮춘다). A4 30쪽이면 5MB 안팎.
 * maxBytes를 넘을 것 같으면 중간에 멈추고 오류를 던진다.
 */
export async function hwpToPdf(
  bytes: Uint8Array,
  onProgress?: (done: number, total: number) => void,
  maxBytes = Infinity,
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await openHwp(bytes);
  const canvas = document.createElement("canvas");
  let failed = false;
  try {
    const total = doc.pageCount();
    if (total <= 0) throw new Error("쪽이 없습니다.");
    const pdf = await PDFDocument.create();
    const scale = scaleFor(total);
    let imageBytes = 0;
    for (let i = 0; i < total; i++) {
      doc.renderPageToCanvas(i, canvas, scale);
      const jpgBytes = await canvasToJpeg(canvas);
      imageBytes += jpgBytes.byteLength;
      if (imageBytes > maxBytes) throw new Error("미리보기 PDF가 너무 커집니다");
      const jpg = await pdf.embedJpg(jpgBytes);
      // 캔버스 px(96dpi 기준 × scale) → PDF pt(72dpi)
      const w = (canvas.width / scale) * (72 / 96);
      const h = (canvas.height / scale) * (72 / 96);
      const page = pdf.addPage([w, h]);
      page.drawImage(jpg, { x: 0, y: 0, width: w, height: h });
      onProgress?.(i + 1, total);
      // 긴 문서에서 화면이 굳지 않게 한 쪽마다 숨 고르기
      await new Promise((r) => setTimeout(r, 0));
    }
    return await pdf.save();
  } catch (e) {
    failed = true;
    throw e;
  } finally {
    canvas.width = canvas.height = 0;
    try {
      doc.free();
    } catch (freeError) {
      // free가 실패해도 원래 오류를 덮지 않는다.
      if (!failed) throw freeError;
    }
  }
}
