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
  const blob = await new Promise<Blob>((resolve, reject) =>
    white.toBlob((b) => (b ? resolve(b) : reject(new Error("jpeg"))), "image/jpeg", 0.88),
  );
  return blob.arrayBuffer();
}

/**
 * 한글 파일 → 미리보기 PDF(쪽마다 그림). 글자 검색은 안 되지만 모두가 같은 쪽·같은 자리를 본다.
 * scale 2 = 192dpi 정도. A4 30쪽이면 5MB 안팎.
 */
export async function hwpToPdf(
  bytes: Uint8Array,
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await openHwp(bytes);
  try {
    const total = doc.pageCount();
    if (total <= 0) throw new Error("쪽이 없습니다.");
    const pdf = await PDFDocument.create();
    const canvas = document.createElement("canvas");
    const scale = 2;
    for (let i = 0; i < total; i++) {
      doc.renderPageToCanvas(i, canvas, scale);
      const jpg = await pdf.embedJpg(await canvasToJpeg(canvas));
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
  } finally {
    doc.free();
  }
}
