"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { createVersionAction } from "./actions";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { Field, FormError, Input } from "@/components/Field";
import type { BlobUploadMode, StorageKind } from "@/lib/storage";
import { extensionOf, formatBytes, isOriginalName, MAX_FILE_BYTES, ORIGINAL_ACCEPT } from "@/lib/files";
import { hwpToPdf, isHwpName } from "@/lib/hwp-client";
import { asciiKey, putToBlob, readIntoMemory } from "@/lib/upload-client";

/**
 * 새 버전 올리기. 원고 파일 하나(필수) + 미리보기용 PDF(한글·워드일 때 권장).
 * Blob 방식이면 브라우저가 Blob에 바로 올리고, 로컬 방식이면 /api/upload로 보낸다.
 * 어느 쪽이든 끝난 뒤 서버 액션으로 버전 한 줄을 남긴다.
 */
export function UploadForm({
  partId,
  storage,
  blobMode,
  openRequests = [],
}: {
  partId: string;
  storage: Exclude<StorageKind, "none">;
  blobMode: BlobUploadMode;
  /** 이 버전으로 응답할 수 있는 열린 요청들 */
  openRequests?: { id: string; number: number; body: string }[];
}) {
  const [respondsTo, setRespondsTo] = useState<string[]>([]);
  const router = useRouter();
  const [original, setOriginal] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState<number | null>(null);
  const [estimated, setEstimated] = useState(false);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [converting, setConverting] = useState<{ done: number; total: number } | null>(null);
  const [convertFailed, setConvertFailed] = useState(false);
  const originalInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  const originalIsPdf = original ? extensionOf(original.name) === "pdf" : false;
  const originalIsHwp = original ? isHwpName(original.name) : false;
  const needsPdfHint = original && !originalIsPdf && !originalIsHwp && !pdf;

  /** 고르는 즉시 메모리에 복사해 둔다. 그 뒤 디스크의 파일이 바뀌어도(한글 자동 저장 등) 올리기에 지장이 없다. */
  async function remember(f: File): Promise<File | null> {
    try {
      return await readIntoMemory(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 읽지 못했습니다. 다시 골라 주세요.");
      return null;
    }
  }

  async function chooseOriginal(f: File) {
    setError(undefined);
    setConvertFailed(false);
    const copy = await remember(f);
    if (copy) setOriginal(copy);
  }

  async function choosePdf(f: File) {
    setError(undefined);
    const copy = await remember(f);
    if (copy) setPdf(copy);
  }

  function pick(files: FileList | File[]) {
    const list = Array.from(files);
    const pdfs = list.filter((f) => extensionOf(f.name) === "pdf");
    const docs = list.filter((f) => isOriginalName(f.name) && extensionOf(f.name) !== "pdf");
    setError(undefined);
    if (docs[0]) void chooseOriginal(docs[0]);
    if (docs[0] && pdfs[0]) void choosePdf(pdfs[0]);
    else if (!docs[0] && pdfs[0]) {
      // PDF만 떨어뜨리면: 원고가 이미 있으면 미리보기로, 없으면 원고 자체로.
      if (original && !originalIsPdf) void choosePdf(pdfs[0]);
      else void chooseOriginal(pdfs[0]);
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
      return putToBlob({
        pathname: `parts/${partId}/${asciiKey(file.name)}`,
        body: file,
        blobMode,
        clientPayload: JSON.stringify({ partId }),
        onProgress,
        onMode: (real) => setEstimated(!real),
      });
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
    // 고른 파일을 먼저 메모리에 복사한다. 고른 뒤 디스크의 파일이 바뀌어도(한글 자동 저장, 드라이브 동기화) 올리기가 멈추지 않게.
    let source: File;
    let attached: File | null;
    try {
      source = await readIntoMemory(original);
      attached = pdf ? await readIntoMemory(pdf) : null;
    } catch (e) {
      setPending(false);
      setOriginal(null);
      setPdf(null);
      if (originalInput.current) originalInput.current.value = "";
      if (pdfInput.current) pdfInput.current.value = "";
      setError(e instanceof Error ? e.message : "파일을 읽지 못했습니다. 다시 골라 주세요.");
      return;
    }
    // 한글 파일이고 PDF를 따로 안 붙였으면 브라우저에서 미리보기 PDF를 만든다.
    let previewPdf = attached;
    if (!previewPdf && originalIsHwp && !convertFailed) {
      try {
        setConverting({ done: 0, total: 0 });
        const bytes = await hwpToPdf(new Uint8Array(await source.arrayBuffer()), (done, total) =>
          setConverting({ done, total }),
        );
        const base = source.name.replace(/\.(hwpx?|HWPX?)$/, "");
        previewPdf = new File([bytes as BlobPart], `${base} (자동 변환).pdf`, { type: "application/pdf" });
      } catch (e) {
        setConvertFailed(true);
        setPending(false);
        setConverting(null);
        setError(
          `한글 파일을 읽어 PDF를 만들지 못했습니다(${e instanceof Error ? e.message : "알 수 없는 오류"}). ` +
            "한글에서 [PDF로 저장]한 파일을 함께 올리거나, 미리보기 없이 그대로 올리려면 버튼을 한 번 더 누르세요.",
        );
        return;
      } finally {
        setConverting(null);
      }
    }
    setProgress(0);
    try {
      let originalRef: string;
      let pdfRef: string | null = null;
      if (storage === "blob") {
        const total = source.size + (previewPdf?.size ?? 0);
        originalRef = await putFile(source, (pct) => setProgress((pct * source.size) / total));
        if (previewPdf) {
          const p = previewPdf;
          pdfRef = await putFile(p, (pct) => setProgress(((source.size + (pct / 100) * p.size) / total) * 100));
        }
      } else {
        const form = new FormData();
        form.set("partId", partId);
        form.set("original", source);
        if (previewPdf) form.set("pdf", previewPdf);
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
        originalSize: source.size,
        pdfRef,
        pdfName: previewPdf?.name ?? null,
        note,
        respondsTo,
      });
      if (!result.ok) throw new Error(result.error);
      setOriginal(null);
      setPdf(null);
      setConvertFailed(false);
      setRespondsTo([]);
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
          한글(hwp, hwpx)·워드(docx)·PDF 파일을 여기에 끌어다 놓거나 아래에서 고르세요. 최대 100MB. 한글 파일은 올릴 때
          사이트가 미리보기 PDF를 자동으로 만듭니다.
        </p>
        <Field label="원고 파일" hint={original ? `${original.name} · ${formatBytes(original.size)}` : undefined}>
          <Input
            ref={originalInput}
            type="file"
            accept={ORIGINAL_ACCEPT}
            disabled={pending}
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void chooseOriginal(f);
            }}
            className="file:mr-3 file:border file:border-ink file:bg-paper file:px-3 file:py-1 file:font-bold"
          />
        </Field>
        {!originalIsPdf && (
          <Field
            label={originalIsHwp ? "미리보기용 PDF (선택)" : "미리보기용 PDF (워드 원고일 때)"}
            hint={
              pdf
                ? `${pdf.name} · ${formatBytes(pdf.size)}`
                : originalIsHwp
                  ? "한글에서 [PDF로 저장]한 파일을 붙이면 자동 변환 대신 그 PDF를 씁니다. 표·글꼴이 많은 원고는 이쪽이 더 정확합니다."
                  : "워드에서 [PDF로 저장]한 파일을 함께 올리면 사이트 안에서 바로 펼쳐 볼 수 있습니다."
            }
          >
            <Input
              ref={pdfInput}
              type="file"
              accept=".pdf"
              disabled={pending}
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                if (f) void choosePdf(f);
              }}
              className="file:mr-3 file:border file:border-ink file:bg-paper file:px-3 file:py-1 file:font-bold"
            />
          </Field>
        )}
      </div>
      <Field label="메모 (선택)" hint="예: 1·3번 요청 반영">
        <Input value={note} onChange={(e) => setNote(e.currentTarget.value)} maxLength={200} disabled={pending} />
      </Field>
      {openRequests.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-bold text-ink-2">이 버전으로 응답하는 요청</legend>
          {openRequests.map((q) => (
            <label key={q.id} className="flex min-h-9 items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-rb"
                checked={respondsTo.includes(q.id)}
                disabled={pending}
                onChange={(e) => {
                  const on = e.currentTarget.checked;
                  setRespondsTo((prev) => (on ? [...prev, q.id] : prev.filter((id) => id !== q.id)));
                }}
              />
              <span className="min-w-0">
                <span className="font-serif font-black text-rb">{q.number}</span>{" "}
                <span className="line-clamp-2">{q.body}</span>
              </span>
            </label>
          ))}
          <span className="text-[12.5px] text-ink-3">고른 요청은 올리면 ‘응답함’이 되어 편집장 확인 차례로 넘어갑니다.</span>
        </fieldset>
      )}
      {needsPdfHint && (
        <p className="text-[13px] leading-snug text-st-amber-fg">
          PDF 없이 올리면 이 버전은 내려받아서만 볼 수 있고, 사이트 안 미리보기는 비어 있습니다.
        </p>
      )}
      <FormError message={error} />
      {converting && (
        <p aria-live="polite" className="text-sm text-ink-2">
          한글 원고를 읽어 미리보기 PDF를 만드는 중…{converting.total ? ` (${converting.done}/${converting.total}쪽)` : ""}
        </p>
      )}
      {progress !== null && (
        <div aria-live="polite" className="flex items-center gap-3 text-sm">
          <span className="h-2 flex-1 bg-rb-tint">
            <span className="block h-full bg-rb transition-[width]" style={{ width: `${Math.round(progress)}%` }} />
          </span>
          <span className="w-10 text-right font-bold">{Math.round(progress)}%</span>
        </div>
      )}
      {progress !== null && estimated && (
        <p className="text-[12.5px] leading-snug text-ink-3">
          지금 인터넷 환경에서는 정확한 진행률을 잴 수 없어 예상치로 보여 드립니다. 다 올라갈 때까지 이 화면을 닫지 마세요.
        </p>
      )}
      <Button type="submit" variant="primary" pending={pending} pendingLabel="올리는 중…" disabled={!original}>
        {convertFailed ? "미리보기 없이 올리기" : original ? "이 파일로 새 버전 올리기" : "새 버전 올리기"}
      </Button>
    </form>
  );
}
