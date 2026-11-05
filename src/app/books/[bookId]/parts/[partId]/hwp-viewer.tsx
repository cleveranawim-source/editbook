"use client";

import { useEffect, useRef, useState } from "react";
import type { HwpDocument } from "@rhwp/core";
import { Button } from "@/components/Button";
import { openHwp } from "@/lib/hwp-client";

const ZOOMS = [0.6, 0.8, 1, 1.25, 1.5, 2];

/**
 * 미리보기 PDF가 없는 한글 버전을 사이트가 직접 그린다(간이 미리보기).
 * 글꼴·줄바꿈이 보는 사람 컴퓨터에 따라 조금 달라질 수 있어, 수정 요청(3단계)은 PDF가 있는 버전에서만 받는다.
 * 부모가 key로 쓰므로 문서가 바뀌면 상태가 새로 시작된다.
 */
export function HwpViewer({ url, label }: { url: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<HwpDocument | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let opened: HwpDocument | null = null;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`파일을 받지 못했습니다(${res.status}).`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        opened = await openHwp(bytes);
        if (cancelled) return;
        const probe = document.createElement("canvas");
        opened.renderPageToCanvas(0, probe, 1);
        setPageWidth(probe.width || 794);
        setNumPages(opened.pageCount());
        setDoc(opened);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "한글 파일을 읽지 못했습니다.");
      }
    })();
    return () => {
      cancelled = true;
      if (opened) opened.free();
    };
  }, [url]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !width || !pageWidth) return;
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    const canvases = Array.from(el.querySelectorAll<HTMLCanvasElement>("canvas[data-page]"));
    const dpr = window.devicePixelRatio || 1;
    const scale = (width / pageWidth) * ZOOMS[zoomIndex] * dpr;
    (async () => {
      for (const canvas of canvases) {
        if (cancelled) return;
        const n = Number(canvas.dataset.page);
        doc.renderPageToCanvas(n - 1, canvas, scale);
        canvas.style.width = `${Math.floor(canvas.width / dpr)}px`;
        canvas.style.height = `${Math.floor(canvas.height / dpr)}px`;
        await new Promise((r) => setTimeout(r, 0));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, width, pageWidth, zoomIndex, numPages]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-rule px-4 py-2 text-sm">
        <span className="font-bold">{label}</span>
        <span className="text-ink-2">{numPages ? `${numPages}쪽` : error ? "" : "한글 파일 읽는 중…"}</span>
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
      <p className="px-4 py-1.5 text-[12.5px] text-st-amber-fg">
        간이 미리보기: 사이트가 한글 파일을 직접 그린 것이라 글꼴·줄바꿈이 원본과 다를 수 있습니다. 정확한 모양은 원본을 내려받아
        확인하세요.
      </p>
      {error && <p className="px-4 py-3 text-sm text-st-red-fg">한글 파일을 읽지 못했습니다. {error}</p>}
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
