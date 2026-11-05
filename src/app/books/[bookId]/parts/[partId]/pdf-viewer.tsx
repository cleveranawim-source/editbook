"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/Button";

const ZOOMS = [0.6, 0.8, 1, 1.25, 1.5, 2];

/**
 * pdf.js로 모든 쪽을 캔버스에 그린다. 기본은 너비 맞춤(zoom 1), 버튼으로 확대·축소.
 * 3단계에서 이 캔버스 위에 요청 영역 레이어가 얹힌다.
 * 부모가 key={url}로 쓰므로 문서가 바뀌면 상태가 새로 시작된다.
 */
export function PdfViewer({ url, label }: { url: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(0);

  // 문서 열기
  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
        task = pdfjs.getDocument({ url });
        const loaded = await task.promise;
        if (cancelled) return;
        setDoc(loaded);
        setNumPages(loaded.numPages);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "PDF를 열 수 없습니다.");
      }
    })();
    return () => {
      cancelled = true;
      if (task) void task.destroy();
    };
  }, [url]);

  // 너비 추적
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  // 쪽 그리기
  useEffect(() => {
    if (!doc || !width) return;
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    const canvases = Array.from(el.querySelectorAll<HTMLCanvasElement>("canvas[data-page]"));
    (async () => {
      for (const canvas of canvases) {
        if (cancelled) return;
        const n = Number(canvas.dataset.page);
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const scale = (width / base.width) * ZOOMS[zoomIndex];
        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvas, canvasContext: ctx, viewport, transform: [dpr, 0, 0, dpr, 0, 0] }).promise;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, width, zoomIndex, numPages]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-rule px-4 py-2 text-sm">
        <span className="font-bold">{label}</span>
        <span className="text-ink-2">{numPages ? `${numPages}쪽` : error ? "" : "여는 중…"}</span>
        <span className="ml-auto flex items-center gap-1">
          <Button size="sm" aria-label="축소" disabled={zoomIndex === 0} onClick={() => setZoomIndex((i) => i - 1)}>
            −
          </Button>
          <span className="w-12 text-center tabular-nums">{Math.round(ZOOMS[zoomIndex] * 100)}%</span>
          <Button
            size="sm"
            aria-label="확대"
            disabled={zoomIndex === ZOOMS.length - 1}
            onClick={() => setZoomIndex((i) => i + 1)}
          >
            +
          </Button>
        </span>
      </div>
      <p className="px-4 py-1.5 text-[12.5px] text-ink-3">
        미리보기는 한글·워드 원본과 조금 다를 수 있습니다. 정확한 모양은 원본을 내려받아 확인하세요.
      </p>
      {error && <p className="px-4 py-3 text-sm text-st-red-fg">PDF를 열 수 없습니다. {error}</p>}
      <div ref={containerRef} className="max-h-[calc(100vh-200px)] min-h-[320px] overflow-auto bg-rb-tint/60 px-3 py-4">
        <div className="flex flex-col items-start gap-4">
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} className="relative shrink-0">
              <canvas data-page={i + 1} className="block border border-rule bg-white shadow-sm" />
              <span className="absolute -bottom-0 right-1 translate-y-full text-[11px] text-ink-3">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
