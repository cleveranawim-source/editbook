import Link from "next/link";
import type { Part, User, Version } from "@/generated/prisma/client";
import type { PartStatus } from "@/lib/part-status";
import { cx } from "@/components/cx";
import { ProgressStrip } from "@/components/ProgressStrip";
import { StatusBadge } from "@/components/StatusBadge";
import { TurnTag } from "@/components/Tag";

/** 파트 표의 열 너비. 머리 띠(TableHead)와 행이 같은 값을 쓴다. */
export const PART_COLUMNS = "lg:grid-cols-[56px_minmax(0,1fr)_128px_150px_236px]";

/**
 * 파트 한 행. 넓은 화면(≥1024)에서는 고정 62px 한 줄,
 * 좁은 화면에서는 번호를 왼쪽에 세우고 세 줄(제목 / 담당·진행 / 상태)로 쌓는다.
 */
export function PartRow({
  part,
  status,
  mine,
  latest,
}: {
  part: Part & { assignee: User | null };
  status: PartStatus;
  mine: boolean;
  /** 최신 원고 버전. 없으면 undefined. */
  latest?: Pick<Version, "number" | "createdAt">;
}) {
  const sub = [part.note, latest ? `v${latest.number} · ${formatDate(latest.createdAt)}` : null].filter(Boolean).join(" · ");
  // 빨강 계열(연한 붉은 바탕 + 빨간 꼬리표)은 내 차례에만 쓴다. 내 파트는 꼬리표만.
  const myTurn = status.kind === "REQUESTS";
  return (
    <li
      className={cx(
        "grid grid-cols-[36px_minmax(0,1fr)] items-start gap-x-3 gap-y-2.5 border-b border-rule px-4 py-4 transition-colors last:border-b-0",
        // 손을 올리면 행 위아래 괘선이 적갈색으로 진해진다(책 카드의 테두리와 같은 말). 바탕은 그대로.
        "hover:border-b-rb has-[+li:hover]:border-b-rb",
        "lg:h-[62px] lg:items-center lg:gap-0 lg:py-0 lg:pl-0 lg:pr-6",
        PART_COLUMNS,
        myTurn && "bg-mine",
      )}
    >
      <span className="row-span-3 pt-px text-center font-serif text-[22px] font-black leading-[1.1] text-rb lg:row-span-1 lg:pt-0">
        <span className="sr-only">순서 </span>
        {part.order}
      </span>

      <div className="min-w-0 lg:pr-5">
        {/* 좁은 화면: 꼬리표가 줄바꿈된 제목 끝에 이어 붙는다. 넓은 화면: 한 줄, 제목만 줄임표. */}
        <div className="min-w-0 lg:flex lg:items-center lg:gap-2">
          <Link
            href={`/books/${part.bookId}/parts/${part.id}`}
            className="text-[17px] font-bold leading-snug text-ink underline decoration-rb-line underline-offset-4 hover:decoration-rb lg:min-w-0 lg:truncate"
          >
            {part.title}
          </Link>
          {myTurn && (
            <span className="ml-2 inline-block align-[2px] lg:ml-0 lg:shrink-0">
              <TurnTag kind="turn" />
            </span>
          )}
          {mine && (
            <span className="ml-2 inline-block align-[2px] lg:ml-0 lg:shrink-0">
              <TurnTag kind="mine" />
            </span>
          )}
        </div>
        {sub && <p className="mt-0.5 text-[13px] leading-snug text-ink-2 lg:truncate">{sub}</p>}
      </div>

      <div className="flex min-w-0 items-center gap-4 lg:contents">
        <span className={cx("min-w-0 truncate text-sm", !part.assignee && "text-ink-3")}>
          {part.assignee ? (
            <>
              <span className="text-ink-2 lg:sr-only">담당 </span>
              {part.assignee.name}
            </>
          ) : (
            "담당 없음"
          )}
        </span>
        <ProgressStrip kind={status.kind} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>
    </li>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" }).format(d);
}
