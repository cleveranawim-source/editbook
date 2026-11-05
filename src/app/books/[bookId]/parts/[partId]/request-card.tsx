"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { FormError, Input, Textarea } from "@/components/Field";
import { formatBytes, MAX_ATTACHMENT_BYTES } from "@/lib/files";
import { uploadFile, type UploadTarget } from "@/lib/upload-client";
import { StatusBadge } from "@/components/StatusBadge";
import {
  canRemark,
  COMMENT_ACTION_LABEL,
  statusLabel,
  toneFor,
  type Perspective,
  type RequestView,
} from "@/lib/request-view";
import { commentAction, rerequestAction, resolveAction, type ActionResult } from "./actions";

const when = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

export function RequestCard({
  request: r,
  perspective,
  canWrite,
  selected,
  onCurrentVersion,
  onSelect,
  upload,
  onRemark,
  remarkAvailable,
}: {
  request: RequestView;
  perspective: Perspective;
  canWrite: boolean;
  selected: boolean;
  /** 지금 펼친 버전에 그려진 요청인가 */
  onCurrentVersion: boolean;
  onSelect: () => void;
  /** 댓글 첨부를 올릴 곳. 없으면 첨부 칸을 숨긴다. */
  upload?: Omit<UploadTarget, "purpose"> | null;
  /** 지금 버전 위에 다시 그리기 시작 */
  onRemark?: () => void;
  /** 지금 펼친 버전에 미리보기 PDF가 있어 다시 표시할 수 있는가 */
  remarkAvailable?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const tone = toneFor(r.kind, r.status, perspective);
  const isEditor = perspective === "editor";
  const isAuthor = perspective === "author";

  function act(fn: () => Promise<ActionResult>) {
    setError(undefined);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else {
        setText("");
        setFile(null);
        if (fileInput.current) fileInput.current.value = "";
        router.refresh();
      }
    });
  }

  async function sendComment(): Promise<ActionResult> {
    let attachment = null;
    if (file) {
      if (!upload) return { ok: false, error: "파일 저장소가 연결되지 않았습니다." };
      if (file.size > MAX_ATTACHMENT_BYTES) return { ok: false, error: "첨부 파일은 100MB까지 올릴 수 있습니다." };
      try {
        const { ref } = await uploadFile({ ...upload, purpose: "attachment" }, file);
        attachment = { ref, name: file.name, size: file.size };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "첨부를 올리지 못했습니다." };
      }
    }
    return commentAction(r.id, text, attachment);
  }

  const primary =
    isAuthor && r.kind === "REQUEST" && r.status === "OPEN"
      ? "답글 달고 응답하기"
      : isEditor && r.kind === "QUESTION" && r.status === "OPEN"
        ? "답변하기"
        : "댓글 달기";
  const canResolve = isEditor && r.kind === "REQUEST" && r.status !== "RESOLVED";
  const canRerequest = isEditor && r.kind === "REQUEST" && r.status !== "OPEN";

  return (
    <li
      id={`request-${r.id}`}
      className={cx(
        "border-b border-rule last:border-b-0",
        selected ? "bg-rb-tint" : "bg-paper",
        tone === "red" && !selected && "bg-mine",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        className="block w-full px-5 pb-2 pt-4 text-left"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-serif text-lg font-black text-rb">{r.number}</span>
          <span className="text-[13px] font-bold text-ink-2">{r.kind === "QUESTION" ? "질문" : "요청"}</span>
          <StatusBadge tone={tone}>{statusLabel(r.kind, r.status)}</StatusBadge>
          <span className="text-[13px] text-ink-2">
            {r.authorName} · {when.format(new Date(r.createdAt))}
          </span>
        </span>
        <span className="mt-1 flex flex-wrap gap-x-2 text-[12.5px] text-ink-3">
          <span>{r.page}쪽</span>
          {!onCurrentVersion && <span className="font-bold text-st-amber-fg">v{r.versionNumber}에서 표시됨</span>}
        </span>
        <span className={cx("mt-1.5 block whitespace-pre-wrap text-[15px] leading-relaxed", !selected && "line-clamp-3")}>
          {r.body}
        </span>
      </button>

      {(selected || r.comments.length > 0) && (
        <div className="px-5 pb-4">
          {r.comments.length > 0 && (
            <ol className={cx("flex flex-col gap-2 border-l-2 border-rule pl-3", !selected && "max-h-24 overflow-hidden")}>
              {r.comments.map((c) => (
                <li key={c.id} className="text-sm">
                  <span className="font-bold">{c.authorName}</span>{" "}
                  {COMMENT_ACTION_LABEL[c.action] && (
                    <span className="text-[12.5px] font-bold text-rb">{COMMENT_ACTION_LABEL[c.action]} </span>
                  )}
                  <span className="text-[12px] text-ink-3">{when.format(new Date(c.createdAt))}</span>
                  {c.body && <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>}
                  {c.attachment && (
                    <a href={c.attachment.url} className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-ink underline">
                      첨부: {c.attachment.name}
                      {c.attachment.size !== null && <span className="text-ink-3 no-underline"> ({formatBytes(c.attachment.size)})</span>}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          )}

          {selected && !onCurrentVersion && (
            <a href={`?v=${r.versionNumber}&r=${r.id}`} className="mt-2 inline-block text-[13px] font-bold text-ink underline">
              v{r.versionNumber}에서 이 자리 보기
            </a>
          )}
          {selected && canWrite && !onCurrentVersion && remarkAvailable && onRemark && canRemark(r.kind, perspective) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border border-dashed border-rb-line p-2.5 text-[13px]">
              <span className="text-ink-2">지금 보고 있는 버전 위에 이 {r.kind === "QUESTION" ? "질문" : "요청"}을 다시 그릴 수 있습니다.</span>
              <Button size="sm" variant="secondary" onClick={onRemark}>
                이 버전에 다시 표시
              </Button>
            </div>
          )}

          {selected && canWrite && perspective !== "other" && (
            <form
              className="mt-3 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                act(sendComment);
              }}
            >
              <Textarea
                value={text}
                onChange={(e) => setText(e.currentTarget.value)}
                rows={3}
                maxLength={2000}
                placeholder={canRerequest ? "댓글, 또는 재요청할 내용" : "댓글"}
                aria-label={`${r.number}번에 댓글`}
                disabled={pending}
              />
              {upload && (
                <label className="flex flex-col gap-1 text-[13px] font-bold text-ink-2">
                  파일 첨부 (선택, 100MB까지)
                  <Input
                    ref={fileInput}
                    type="file"
                    disabled={pending}
                    onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                    className="py-1.5 text-sm file:mr-2 file:border file:border-ink file:bg-paper file:px-2 file:py-0.5 file:font-bold"
                  />
                </label>
              )}
              <FormError message={error} />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="secondary" size="sm" pending={pending} pendingLabel="보내는 중…" disabled={!text.trim() && !file}>
                  {primary}
                </Button>
                {canResolve && (
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => resolveAction(r.id, text))}>
                    확인 완료
                  </Button>
                )}
                {canRerequest && (
                  <Button
                    size="sm"
                    variant="quietDanger"
                    disabled={pending || !text.trim()}
                    onClick={() => act(() => rerequestAction(r.id, text))}
                  >
                    재요청
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
