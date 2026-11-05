"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { FormError, Textarea } from "@/components/Field";
import { StatusBadge } from "@/components/StatusBadge";
import {
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
}: {
  request: RequestView;
  perspective: Perspective;
  canWrite: boolean;
  selected: boolean;
  /** 지금 펼친 버전에 그려진 요청인가 */
  onCurrentVersion: boolean;
  onSelect: () => void;
}) {
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
        router.refresh();
      }
    });
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
                </li>
              ))}
            </ol>
          )}

          {selected && canWrite && perspective !== "other" && (
            <form
              className="mt-3 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                act(() => commentAction(r.id, text));
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
              <FormError message={error} />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="secondary" size="sm" pending={pending} disabled={!text.trim()}>
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
