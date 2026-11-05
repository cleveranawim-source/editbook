"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { cx } from "@/components/cx";
import { EmptyState } from "@/components/EmptyState";
import { FormError, Textarea } from "@/components/Field";
import { isClosed, toneFor, type Perspective, type Rect, type RequestView, type Tone } from "@/lib/request-view";
import { createRequestAction, moveRequestAction } from "./actions";
import type { UploadTarget } from "@/lib/upload-client";
import { PdfViewer } from "./pdf-viewer";
import { RequestCard } from "./request-card";

const BOX: Record<Tone, string> = {
  red: "border-st-red",
  yellow: "border-st-amber",
  green: "border-st-green",
  gray: "border-st-gray",
};
const TAG: Record<Tone, string> = {
  red: "bg-st-red text-white",
  yellow: "bg-st-amber text-white",
  green: "bg-st-green text-white",
  gray: "bg-st-gray text-white",
};

type Draft = Rect;

/**
 * 파트 편집실: 왼쪽 미리보기 위에 요청 영역, 오른쪽 요청 카드.
 * 카드를 누르면 왼쪽이 그 쪽으로 가고 영역이 강조된다. 영역을 누르면 카드가 강조된다.
 */
export function PartWorkspace({
  partId,
  version,
  pdfUrl,
  requests,
  perspective,
  canWrite,
  initialSelectedId,
  fallback,
  side,
  upload,
}: {
  partId: string;
  version: { id: string; number: number } | null;
  /** 미리보기 PDF 주소. 없으면 fallback을 보여 주고 영역 표시는 막는다. */
  pdfUrl: string | null;
  requests: RequestView[];
  perspective: Perspective;
  canWrite: boolean;
  initialSelectedId?: string;
  fallback: ReactNode;
  /** 요청 목록 아래 오른쪽 기둥에 놓을 카드들(새 버전 올리기, 버전 목록) */
  side: ReactNode;
  /** 댓글 첨부를 올릴 곳(저장소가 없으면 null) */
  upload: Omit<UploadTarget, "purpose"> | null;
}) {
  const [remarkId, setRemarkId] = useState<string | null>(null);
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedId);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftError, setDraftError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [renderTick, setRenderTick] = useState(0);
  const dragRef = useRef<{ page: number; x0: number; y0: number; el: HTMLElement } | null>(null);
  const [live, setLive] = useState<Draft | null>(null);

  const canMark = canWrite && perspective !== "other" && Boolean(pdfUrl && version);
  const markLabel = perspective === "editor" ? "요청 표시" : "질문 표시";
  const onThisVersion = useMemo(() => requests.filter((r) => r.versionId === version?.id), [requests, version]);
  const openCount = requests.filter((r) => !isClosed(r.status)).length;
  const visible = showAll ? requests : requests.filter((r) => !isClosed(r.status) || r.id === selectedId);

  const onRendered = useCallback(() => setRenderTick((t) => t + 1), []);

  // 선택한 요청의 영역으로 미리보기를 옮긴다.
  useEffect(() => {
    if (!selectedId) return;
    const mark = document.querySelector<HTMLElement>(`[data-mark="${selectedId}"]`);
    mark?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedId, renderTick]);

  function select(r: RequestView) {
    // 다른 버전의 요청: 처음 누르면 카드만 펼쳐(다시 표시·그 버전 보기를 고를 수 있게), 다시 누르면 접는다.
    setSelectedId(r.id === selectedId ? undefined : r.id);
  }

  function selectFromMark(id: string) {
    setSelectedId(id);
    document.getElementById(`request-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function ratio(e: PointerEvent<HTMLElement>, el: HTMLElement) {
    const b = el.getBoundingClientRect();
    return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height };
  }

  function rectFrom(page: number, x0: number, y0: number, x1: number, y1: number): Draft {
    const c = (n: number) => Math.min(1, Math.max(0, n));
    const ax = c(Math.min(x0, x1));
    const ay = c(Math.min(y0, y1));
    return { page, x: ax, y: ay, w: c(Math.max(x0, x1)) - ax, h: c(Math.max(y0, y1)) - ay };
  }

  function onDown(page: number, e: PointerEvent<HTMLDivElement>) {
    if (!drawing) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const p = ratio(e, el);
    dragRef.current = { page, x0: p.x, y0: p.y, el };
    setLive({ page, x: p.x, y: p.y, w: 0, h: 0 });
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    const p = ratio(e, d.el);
    setLive(rectFrom(d.page, d.x0, d.y0, p.x, p.y));
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    const p = ratio(e, d.el);
    const r = rectFrom(d.page, d.x0, d.y0, p.x, p.y);
    setLive(null);
    if (r.w < 0.01 || r.h < 0.005) return;
    setDrawing(false);
    if (remarkId && version) {
      const id = remarkId;
      setRemarkId(null);
      void moveRequestAction(id, { ...r, versionId: version.id }).then((res) => {
        if (!res.ok) setDraftError(res.error);
        else {
          setSelectedId(id);
          router.refresh();
        }
      });
      return;
    }
    setDraft(r);
    setDraftError(undefined);
  }

  async function saveDraft() {
    if (!draft || !version) return;
    setSaving(true);
    setDraftError(undefined);
    const res = await createRequestAction({ ...draft, partId, versionId: version.id, body: draftText }).catch(
      () => ({ ok: false as const, error: "저장하지 못했습니다." }),
    );
    setSaving(false);
    if (!res.ok) {
      setDraftError(res.error);
      return;
    }
    setDraft(null);
    setDraftText("");
    router.refresh();
  }

  const overlay = (page: number) => (
    <div
      className={cx("absolute inset-0", drawing && "cursor-crosshair touch-none")}
      onPointerDown={(e) => onDown(page, e)}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      {onThisVersion
        .filter((r) => r.page === page)
        .map((r) => {
          const tone = toneFor(r.kind, r.status, perspective);
          const sel = r.id === selectedId;
          return (
            <button
              key={r.id}
              type="button"
              data-mark={r.id}
              aria-label={`${r.number}번 ${r.kind === "QUESTION" ? "질문" : "요청"} 영역`}
              onClick={(e) => {
                e.stopPropagation();
                if (!drawing) selectFromMark(r.id);
              }}
              className={cx(
                "absolute border-2 transition-[background-color,box-shadow]",
                BOX[tone],
                r.kind === "QUESTION" && "border-dashed",
                sel ? "bg-rb/10 shadow-[0_0_0_3px_rgba(181,84,42,0.35)]" : "bg-transparent hover:bg-rb/5",
                drawing && "pointer-events-none",
              )}
              style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}
            >
              <span
                className={cx(
                  "absolute -left-[2px] -top-[22px] min-w-[22px] px-1 text-center text-[12.5px] font-bold leading-[20px]",
                  TAG[tone],
                )}
              >
                {r.number}
              </span>
            </button>
          );
        })}
      {[live, draft]
        .filter((d): d is Draft => Boolean(d) && d!.page === page)
        .map((d, i) => (
          <span
            key={i}
            className="pointer-events-none absolute border-2 border-dashed border-ink bg-ink/5"
            style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: `${d.w * 100}%`, height: `${d.h * 100}%` }}
          />
        ))}
    </div>
  );

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Card className="min-w-0 lg:sticky lg:top-4">
        {pdfUrl && version ? (
          <PdfViewer
            key={version.id}
            url={pdfUrl}
            label={`v${version.number} 미리보기`}
            overlay={overlay}
            onRendered={onRendered}
            toolbar={
              canMark && (
                <Button
                  size="sm"
                  variant={drawing ? "primary" : "secondary"}
                  aria-pressed={drawing}
                  onClick={() => {
                    setDrawing((d) => !d);
                    setRemarkId(null);
                    setLive(null);
                  }}
                  className="mr-2"
                >
                  {drawing ? "표시 그만두기" : markLabel}
                </Button>
              )
            }
          />
        ) : (
          fallback
        )}
        {drawing && (
          <p role="status" className="border-t border-rule bg-rb-tint px-4 py-2 text-sm font-bold">
            {remarkId
              ? `${requests.find((x) => x.id === remarkId)?.number ?? ""}번을 이 버전 위에 다시 그리세요. 끌어서 네모로 표시합니다.`
              : "원고 위에서 고칠 곳을 끌어서 네모로 표시하세요."}
          </p>
        )}
        {draftError && !draft && <p className="border-t border-rule px-4 py-2 text-sm text-st-red-fg">{draftError}</p>}
      </Card>

      <div className="flex flex-col gap-7">
        <Card as="section" aria-labelledby="requests-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-3 pt-5">
            <CardTitle id="requests-heading" count={`진행 중 ${openCount}`}>
              요청
            </CardTitle>
            {requests.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAll((s) => !s)}
                className="min-h-11 px-1 text-sm font-medium text-ink underline hover:text-rb"
              >
                {showAll ? "진행 중만 보기" : `전체 ${requests.length}개 보기`}
              </button>
            )}
          </div>

          {draft && (
            <form
              className="flex flex-col gap-2 border-t border-rule bg-rb-tint px-5 py-4"
              onSubmit={(e) => {
                e.preventDefault();
                void saveDraft();
              }}
            >
              <p className="text-sm font-bold">
                새 {perspective === "editor" ? "요청" : "질문"} · {draft.page}쪽
              </p>
              <Textarea
                autoFocus
                rows={4}
                maxLength={2000}
                value={draftText}
                onChange={(e) => setDraftText(e.currentTarget.value)}
                placeholder={perspective === "editor" ? "무엇을 어떻게 고쳐 주면 좋을지 적어 주세요." : "편집장에게 물어볼 내용을 적어 주세요."}
                aria-label="요청 내용"
                disabled={saving}
              />
              <FormError message={draftError} />
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="sm" pending={saving} disabled={!draftText.trim()}>
                  {perspective === "editor" ? "요청 남기기" : "질문 남기기"}
                </Button>
                <Button
                  size="sm"
                  variant="quiet"
                  disabled={saving}
                  onClick={() => {
                    setDraft(null);
                    setDraftText("");
                  }}
                >
                  취소
                </Button>
              </div>
            </form>
          )}

          {visible.length === 0 ? (
            <EmptyState variant="inline">
              {requests.length > 0
                ? "진행 중인 요청이 없습니다."
                : canMark
                  ? `아직 요청이 없습니다. 미리보기 위 [${markLabel}]를 누르고 원고 위에 네모를 그리세요.`
                  : "아직 요청이 없습니다."}
            </EmptyState>
          ) : (
            <ul className="border-t border-rule">
              {visible.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  perspective={perspective}
                  canWrite={canWrite}
                  selected={r.id === selectedId}
                  onCurrentVersion={r.versionId === version?.id}
                  onSelect={() => select(r)}
                  upload={upload}
                  remarkAvailable={canMark}
                  onRemark={() => {
                    setRemarkId(r.id);
                    setDrawing(true);
                    setDraft(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ))}
            </ul>
          )}
        </Card>
        {side}
      </div>
    </div>
  );
}
