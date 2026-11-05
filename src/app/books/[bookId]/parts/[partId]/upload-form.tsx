"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { createVersionAction } from "./actions";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { Field, FormError, Input } from "@/components/Field";
import type { StorageKind } from "@/lib/storage";
import { extensionOf, formatBytes, isOriginalName, MAX_FILE_BYTES, ORIGINAL_ACCEPT, safeFilename } from "@/lib/files";

/**
 * 새 버전 올리기. 원고 파일 하나(필수) + 미리보기용 PDF(한글·워드일 때 권장).
 * Blob 방식이면 브라우저가 Blob에 바로 올리고, 로컬 방식이면 /api/upload로 보낸다.
 * 어느 쪽이든 끝난 뒤 서버 액션으로 버전 한 줄을 남긴다.
 */
export function UploadForm({ partId, storage }: { partId: string; storage: Exclude<StorageKind, "none"> }) {
  const router = useRouter();
  const [original, setOriginal] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const originalInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  const originalIsPdf = original ? extensionOf(original.name) === "pdf" : false;
  const needsPdfHint = original && !originalIsPdf && !pdf;

  function pick(files: FileList | File[]) {
    const list = Array.from(files);
    const pdfs = list.filter((f) => extensionOf(f.name) === "pdf");
    const docs = list.filter((f) => isOriginalName(f.name) && extensionOf(f.name) !== "pdf");
    setError(undefined);
    if (docs[0]) setOriginal(docs[0]);
    if (docs[0] && pdfs[0]) setPdf(pdfs[0]);
    else if (!docs[0] && pdfs[0]) {
      // PDF만 떨어뜨리면: 원고가 이미 있으면 미리보기로, 없으면 원고 자체로.
      if (original && !originalIsPdf) setPdf(pdfs[0]);
      else setOriginal(pdfs[0]);
    }
    if (!docs[0] && !pdfs[0] && list[0]) {
      setError("원고는 한글(hwp, hwpx)·워드(docx)·PDF 파일만 올릴 수 있습니다.");
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (pending) return;
    pick(e.dataTransfer.files);
  }

  async function putFile(file: File, onProgress: (pct: number) => void): Promise<string> {
    if (storage === "blob") {
      const result = await upload(`parts/${partId}/${safeFilename(file.name)}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: JSON.stringify({ partId }),
        multipart: file.size > 8 * 1024 * 1024,
        onUploadProgress: (p) => onProgress(p.percentage),
      });
      return result.url;
    }
    throw new Error("local storage uses /api/upload");
  }

  async function submit() {
    if (!original) {
      setError("원고 파일을 고르세요.");
      return;
    }
    if (original.size > MAX_FILE_BYTES || (pdf && pdf.size > MAX_FILE_BYTES)) {
      setError("파일이 너무 큽니다(최대 100MB).");
      return;
    }
    setPending(true);
    setError(undefined);
    setProgress(0);
    try {
      let originalRef: string;
      let pdfRef: string | null = null;
      if (storage === "blob") {
        const total = original.size + (pdf?.size ?? 0);
        originalRef = await putFile(original, (pct) => setProgress((pct * original.size) / total));
        if (pdf) {
          pdfRef = await putFile(pdf, (pct) => setProgress((original.size + (pct / 100) * pdf.size) / total * 100));
        }
      } else {
        const form = new FormData();
        form.set("partId", partId);
        form.set("original", original);
        if (pdf) form.set("pdf", pdf);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = (await res.json()) as { originalRef?: string; pdfRef?: string | null; error?: string };
        if (!res.ok || !json.originalRef) throw new Error(json.error ?? "업로드에 실패했습니다.");
        originalRef = json.originalRef;
        pdfRef = json.pdfRef ?? null;
      }
      setProgress(100);
      const result = await createVersionAction({
        partId,
        originalRef,
        originalName: original.name,
        originalSize: original.size,
        pdfRef,
        pdfName: pdf?.name ?? null,
        note,
      });
      if (!result.ok) throw new Error(result.error);
      setOriginal(null);
      setPdf(null);
      setNote("");
      if (originalInput.current) originalInput.current.value = "";
      if (pdfInput.current) pdfInput.current.value = "";
      router.push(`?v=${result.number}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "업로드에 실패했습니다. 다시 시도하세요.");
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div
        role="group"
        aria-label="파일 끌어다 놓기"
        onDragOver={(e) => {
          e.preventDefault();
          if (!pending) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          "flex flex-col gap-3 border border-dashed p-4 transition-colors",
          dragging ? "border-rb bg-rb-tint" : "border-rb-line bg-paper",
        )}
      >
        <p className="text-sm text-ink-2">
          한글(hwp, hwpx)·워드(docx)·PDF 파일을 여기에 끌어다 놓거나 아래에서 고르세요. 최대 100MB.
        </p>
        <Field label="원고 파일" hint={original ? `${original.name} · ${formatBytes(original.size)}` : undefined}>
          <Input
            ref={originalInput}
            type="file"
            accept={ORIGINAL_ACCEPT}
            disabled={pending}
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) {
                setError(undefined);
                setOriginal(f);
              }
            }}
            className="file:mr-3 file:border file:border-ink file:bg-paper file:px-3 file:py-1 file:font-bold"
          />
        </Field>
        {!originalIsPdf && (
          <Field
            label="미리보기용 PDF (한글·워드 원고일 때)"
            hint={
              pdf
                ? `${pdf.name} · ${formatBytes(pdf.size)}`
                : "한글·워드에서 [PDF로 저장]한 파일을 함께 올리면 사이트 안에서 바로 펼쳐 볼 수 있습니다."
            }
          >
            <Input
              ref={pdfInput}
              type="file"
              accept=".pdf"
              disabled={pending}
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                if (f) {
                  setError(undefined);
                  setPdf(f);
                }
              }}
              className="file:mr-3 file:border file:border-ink file:bg-paper file:px-3 file:py-1 file:font-bold"
            />
          </Field>
        )}
      </div>
      <Field label="메모 (선택)" hint="예: 1·3번 요청 반영">
        <Input value={note} onChange={(e) => setNote(e.currentTarget.value)} maxLength={200} disabled={pending} />
      </Field>
      {needsPdfHint && (
        <p className="text-[13px] leading-snug text-st-amber-fg">
          PDF 없이 올리면 이 버전은 내려받아서만 볼 수 있고, 사이트 안 미리보기는 비어 있습니다.
        </p>
      )}
      <FormError message={error} />
      {progress !== null && (
        <div aria-live="polite" className="flex items-center gap-3 text-sm">
          <span className="h-2 flex-1 bg-rb-tint">
            <span className="block h-full bg-rb transition-[width]" style={{ width: `${Math.round(progress)}%` }} />
          </span>
          <span className="w-10 text-right font-bold">{Math.round(progress)}%</span>
        </div>
      )}
      <Button type="submit" variant="primary" pending={pending} pendingLabel="올리는 중…" disabled={!original}>
        {original ? "이 파일로 새 버전 올리기" : "새 버전 올리기"}
      </Button>
    </form>
  );
}
