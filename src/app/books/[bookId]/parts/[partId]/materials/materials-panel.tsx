"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { cx } from "@/components/cx";
import { EmptyState } from "@/components/EmptyState";
import { Field, FormError, InlineError, Input } from "@/components/Field";
import { formatBytes, MAX_MATERIAL_BYTES } from "@/lib/files";
import type { BlobUploadMode, StorageKind } from "@/lib/storage";
import { makeThumbnail, uploadFile } from "@/lib/upload-client";
import { addFileMaterialAction, addLinkMaterialAction, deleteMaterialAction } from "./actions";

export type MaterialView = {
  id: string;
  kind: "FILE" | "LINK";
  title: string;
  note: string;
  size: number | null;
  isImage: boolean;
  viewUrl: string | null;
  thumbUrl: string | null;
  downloadUrl: string | null;
  linkUrl: string | null;
  uploaderName: string;
  createdAt: string;
  canDelete: boolean;
};

const when = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" });

type Job = { name: string; size: number; pct: number; state: "waiting" | "uploading" | "done" | "error"; error?: string };

export function MaterialsPanel({
  partId,
  items,
  canAdd,
  storage,
  blobMode,
}: {
  partId: string;
  items: MaterialView[];
  canAdd: boolean;
  storage: StorageKind;
  blobMode: BlobUploadMode;
}) {
  const images = items.filter((m) => m.isImage);
  const others = items.filter((m) => !m.isImage);
  return (
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-7">
        <Card as="section" aria-labelledby="photos-heading">
          <CardTitle id="photos-heading" count={`${images.length}개`} className="px-5 pb-4 pt-5">
            사진
          </CardTitle>
          {images.length === 0 ? (
            <EmptyState variant="inline">아직 사진이 없습니다.</EmptyState>
          ) : (
            <ul className="grid grid-cols-2 gap-3 border-t border-rule p-4 sm:grid-cols-3 xl:grid-cols-4">
              {images.map((m) => (
                <li key={m.id} className="flex min-w-0 flex-col border border-rule bg-paper">
                  <a href={m.viewUrl ?? "#"} target="_blank" rel="noreferrer" className="block aspect-[4/3] overflow-hidden bg-rb-tint">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 저장소의 사진을 그대로 보여 준다 */}
                    <img src={m.thumbUrl ?? m.viewUrl ?? ""} alt={m.title} loading="lazy" className="size-full object-cover" />
                  </a>
                  <div className="flex flex-col gap-0.5 p-2.5 text-[13px]">
                    <span className="truncate font-bold" title={m.title}>
                      {m.title}
                    </span>
                    <span className="text-ink-3">
                      {m.size !== null && `${formatBytes(m.size)} · `}
                      {m.uploaderName} · {when.format(new Date(m.createdAt))}
                    </span>
                    {m.note && <span className="line-clamp-2 text-ink-2">{m.note}</span>}
                    <span className="mt-1 flex flex-wrap gap-x-3">
                      {m.downloadUrl && (
                        <a href={m.downloadUrl} className="text-ink underline">
                          내려받기
                        </a>
                      )}
                      {m.canDelete && <DeleteButton id={m.id} />}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card as="section" aria-labelledby="files-heading">
          <CardTitle id="files-heading" count={`${others.length}개`} className="px-5 pb-4 pt-5">
            파일·링크
          </CardTitle>
          {others.length === 0 ? (
            <EmptyState variant="inline">아직 파일이나 링크가 없습니다.</EmptyState>
          ) : (
            <ul className="border-t border-rule">
              {others.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule px-5 py-3 last:border-b-0">
                  <span className="text-[12.5px] font-bold text-rb">{m.kind === "LINK" ? "링크" : "파일"}</span>
                  {m.kind === "LINK" ? (
                    <a href={m.linkUrl ?? "#"} target="_blank" rel="noreferrer noopener" className="min-w-0 break-all font-bold text-ink underline">
                      {m.title}
                    </a>
                  ) : (
                    <a href={m.downloadUrl ?? "#"} className="min-w-0 break-all font-bold text-ink underline">
                      {m.title}
                    </a>
                  )}
                  <span className="text-[13px] text-ink-3">
                    {m.size !== null && `${formatBytes(m.size)} · `}
                    {m.uploaderName} · {when.format(new Date(m.createdAt))}
                  </span>
                  {m.canDelete && (
                    <span className="ml-auto">
                      <DeleteButton id={m.id} />
                    </span>
                  )}
                  {m.note && <p className="basis-full text-sm text-ink-2">{m.note}</p>}
                  {m.kind === "LINK" && <p className="basis-full break-all text-[12.5px] text-ink-3">{m.linkUrl}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-7">
        {canAdd ? (
          storage === "none" ? (
            <Card className="p-5 text-sm text-ink-2">파일 저장소가 아직 연결되지 않았습니다.</Card>
          ) : (
            <>
              <AddFiles partId={partId} storage={storage} blobMode={blobMode} />
              <AddLink partId={partId} />
            </>
          )
        ) : (
          <Card className="p-5 text-sm text-ink-2">이 파트의 담당 선생님과 편집장만 자료를 올릴 수 있습니다.</Card>
        )}
      </div>
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();
  if (!confirm)
    return (
      <button type="button" onClick={() => setConfirm(true)} className="text-st-red-fg underline">
        지우기
      </button>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await deleteMaterialAction(id);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
        className="font-bold text-st-red-fg underline"
      >
        {pending ? "지우는 중…" : "정말 지우기"}
      </button>
      <button type="button" onClick={() => setConfirm(false)} className="text-ink-2 underline">
        취소
      </button>
      <InlineError message={error} />
    </span>
  );
}

function AddFiles({ partId, storage, blobMode }: { partId: string; storage: Exclude<StorageKind, "none">; blobMode: BlobUploadMode }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function run(files: File[]) {
    if (files.length === 0 || busy) return;
    setBusy(true);
    const list: Job[] = files.map((f) => ({ name: f.name, size: f.size, pct: 0, state: "waiting" }));
    setJobs(list);
    const set = (i: number, patch: Partial<Job>) => setJobs((prev) => prev.map((j, k) => (k === i ? { ...j, ...patch } : j)));
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > MAX_MATERIAL_BYTES) {
        set(i, { state: "error", error: "2GB를 넘습니다." });
        continue;
      }
      set(i, { state: "uploading" });
      try {
        const thumb = await makeThumbnail(f);
        const { ref, thumbRef } = await uploadFile({ partId, purpose: "material", storage, blobMode }, f, {
          thumb,
          onProgress: (pct) => set(i, { pct }),
        });
        const res = await addFileMaterialAction({
          partId,
          ref,
          thumbRef,
          name: f.name,
          size: f.size,
          contentType: f.type,
          note,
        });
        if (!res.ok) throw new Error(res.error);
        set(i, { state: "done", pct: 100 });
      } catch (e) {
        set(i, { state: "error", error: e instanceof Error ? e.message : "올리지 못했습니다." });
      }
    }
    setBusy(false);
    setNote("");
    if (input.current) input.current.value = "";
    router.refresh();
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    void run(Array.from(e.dataTransfer.files));
  }

  return (
    <Card as="section" aria-labelledby="add-files-heading">
      <CardTitle id="add-files-heading" className="px-5 pb-4 pt-5">
        파일 올리기
      </CardTitle>
      <div className="flex flex-col gap-3 border-t border-rule px-5 py-5">
        <div
          role="group"
          aria-label="파일 끌어다 놓기"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cx(
            "flex flex-col gap-3 border border-dashed p-4 transition-colors",
            dragging ? "border-rb bg-rb-tint" : "border-rb-line",
          )}
        >
          <p className="text-sm text-ink-2">사진·PDF·압축 파일 등 어떤 파일이든 여러 개를 한꺼번에 끌어다 놓으세요. 파일당 최대 2GB.</p>
          <Field label="파일 고르기">
            <Input
              ref={input}
              type="file"
              multiple
              disabled={busy}
              onChange={(e) => void run(Array.from(e.currentTarget.files ?? []))}
              className="file:mr-3 file:border file:border-ink file:bg-paper file:px-3 file:py-1 file:font-bold"
            />
          </Field>
        </div>
        <Field label="설명 한 줄 (선택, 이번에 올리는 파일 모두에)">
          <Input value={note} onChange={(e) => setNote(e.currentTarget.value)} maxLength={300} disabled={busy} />
        </Field>
        {jobs.length > 0 && (
          <ul aria-live="polite" className="flex flex-col gap-2 text-sm">
            {jobs.map((j, i) => (
              <li key={i} className="flex flex-col gap-1">
                <span className="flex justify-between gap-2">
                  <span className="truncate">{j.name}</span>
                  <span className={cx("shrink-0 font-bold", j.state === "error" ? "text-st-red-fg" : j.state === "done" ? "text-st-green" : "")}>
                    {j.state === "done" ? "완료" : j.state === "error" ? "실패" : j.state === "waiting" ? "대기" : `${Math.round(j.pct)}%`}
                  </span>
                </span>
                <span className="h-1.5 bg-rb-tint">
                  <span
                    className={cx("block h-full", j.state === "error" ? "bg-st-red" : "bg-rb")}
                    style={{ width: `${j.state === "error" ? 100 : Math.round(j.pct)}%` }}
                  />
                </span>
                {j.error && <span className="text-[12.5px] text-st-red-fg">{j.error}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[12.5px] leading-snug text-ink-3">
          큰 파일은 조각으로 나눠 올리고, 조각이 끊기면 저절로 다시 보냅니다. 올리는 중에 이 화면을 닫으면 처음부터 다시 올려야 합니다.
        </p>
      </div>
    </Card>
  );
}

function AddLink({ partId }: { partId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();
  return (
    <Card as="section" aria-labelledby="add-link-heading">
      <CardTitle id="add-link-heading" className="px-5 pb-4 pt-5">
        링크 걸기
      </CardTitle>
      <form
        className="flex flex-col gap-3 border-t border-rule px-5 py-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(undefined);
          start(async () => {
            const res = await addLinkMaterialAction({ partId, url, title, note });
            if (!res.ok) setError(res.error);
            else {
              setUrl("");
              setTitle("");
              setNote("");
              router.refresh();
            }
          });
        }}
      >
        <p className="text-sm text-ink-2">아주 큰 자료는 구글 드라이브에 두고 공유 링크만 걸어 두세요.</p>
        <Field label="주소">
          <Input value={url} onChange={(e) => setUrl(e.currentTarget.value)} placeholder="https://drive.google.com/…" inputMode="url" />
        </Field>
        <Field label="이름">
          <Input value={title} onChange={(e) => setTitle(e.currentTarget.value)} placeholder="예: 3단원 현장 사진 모음" maxLength={200} />
        </Field>
        <Field label="설명 한 줄 (선택)">
          <Input value={note} onChange={(e) => setNote(e.currentTarget.value)} maxLength={300} />
        </Field>
        <FormError message={error} />
        <Button type="submit" variant="secondary" pending={pending} disabled={!url.trim()}>
          링크 걸기
        </Button>
      </form>
    </Card>
  );
}
