import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { getBookForViewer, getBookSummary, listBooksForUser } from "@/lib/books";
import { listParts } from "@/lib/parts";
import { computePartStatus, type PartStatus } from "@/lib/part-status";
import { canManageBook } from "@/lib/permissions";
import { latestVersionsByPart } from "@/lib/versions";
import { BackLink } from "@/components/BackLink";
import { BookNav } from "@/components/BookNav";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { cx } from "@/components/cx";
import { EmptyState } from "@/components/EmptyState";
import { PART_COLUMNS, PartRow } from "@/components/PartRow";
import { StatusBadge } from "@/components/StatusBadge";
import { TableHead } from "@/components/TableHead";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const user = await requireUser();
  const found = await getBookForViewer(bookId, user);
  if (!found) notFound();
  const { book, role } = found;
  const [parts, summary, myBooks, latest] = await Promise.all([
    listParts(bookId),
    getBookSummary(bookId),
    listBooksForUser(user.id),
    latestVersionsByPart(bookId),
  ]);

  // 요청·확인·완료는 3단계에서 실제 값으로 바뀐다.
  const rows = parts.map((part) => ({
    part,
    latest: latest.get(part.id),
    status: computePartStatus({
      hasVersion: latest.has(part.id),
      openRequests: 0,
      awaitingReview: 0,
      completed: false,
    }),
  }));
  const count = (...kinds: PartStatus["kind"][]) => rows.filter((r) => kinds.includes(r.status.kind)).length;
  const manage = canManageBook(user, role, book.status);
  const archived = book.status === "ARCHIVED";
  const editors = summary?.editorNames.join(", ") || "없음";

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[252px_minmax(0,1fr)]">
      <BookNav books={myBooks} currentId={book.id} />

      <div className="flex min-w-0 flex-col gap-7">
        <BackLink href="/books" className="-mb-5 -mt-2 self-start lg:hidden">
          내 책으로
        </BackLink>

        <Card
          as="header"
          className="flex flex-col gap-5 px-5 py-5 md:flex-row md:items-start md:justify-between md:gap-8 md:px-7 md:py-6"
        >
          <div className="min-w-0">
            <h1 className="font-serif text-[28px] font-black leading-[1.2] tracking-[-0.015em] md:text-[34px]">
              {book.title}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
              <span>
                편집장 {editors} · 교사 {summary?.teacherCount ?? 0}명 · 파트 {parts.length}개
              </span>
              {archived && <StatusBadge tone="gray">보관됨</StatusBadge>}
            </p>
            <ul aria-label="파트 현황" className="mt-4 flex flex-wrap gap-2">
              <CountChip tone="red" label="내 차례" n={count("REQUESTS")} />
              <CountChip tone="yellow" label="상대 차례" n={count("AWAITING", "EDITOR_REVIEW")} />
              <CountChip tone="green" label="완료" n={count("DONE")} />
            </ul>
          </div>
          {manage && (
            <ButtonLink href={`/books/${book.id}/manage`} variant="primary" className="w-full shrink-0 md:w-auto">
              참여자·파트 관리
            </ButtonLink>
          )}
        </Card>

        <section aria-labelledby="parts-heading">
          <h2 id="parts-heading" className="sr-only">
            파트 목록
          </h2>
          {rows.length === 0 ? (
            <EmptyState
              action={
                manage && (
                  <ButtonLink href={`/books/${book.id}/manage`} variant="secondary" className="shrink-0">
                    파트 추가하기
                  </ButtonLink>
                )
              }
            >
              {manage
                ? "아직 파트가 없습니다. 참여자·파트 관리에서 첫 파트를 추가하세요."
                : "아직 파트가 없습니다. 편집장이 참여자·파트 관리에서 추가합니다."}
            </EmptyState>
          ) : (
            <Card>
              <TableHead className={cx("pr-6", PART_COLUMNS)}>
                <span className="text-center">순서</span>
                <span>파트</span>
                <span>담당</span>
                <span>진행</span>
                <span>상태</span>
              </TableHead>
              <ul>
                {rows.map(({ part, status, latest }) => (
                  <PartRow
                    key={part.id}
                    part={part}
                    status={status}
                    latest={latest}
                    mine={part.assigneeUserId === user.id}
                  />
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

const CHIP = {
  red: { line: "border-st-red text-st-red-fg", fill: "bg-st-red-bg" },
  yellow: { line: "border-st-amber text-st-amber-fg", fill: "bg-st-amber-bg" },
  green: { line: "border-st-green text-st-green", fill: "bg-st-green-bg" },
} as const;

/** 머리말 개수 칩: 상태 색 테두리 + 글자, 숫자는 세리프. 0이면 바탕을 비워 조용히 둔다. */
function CountChip({ tone, label, n }: { tone: keyof typeof CHIP; label: string; n: number }) {
  return (
    <li
      className={cx(
        "inline-flex items-baseline gap-1.5 border px-3 py-[5px] text-sm font-bold leading-none",
        CHIP[tone].line,
        n > 0 ? CHIP[tone].fill : "bg-paper",
      )}
    >
      {label}
      <span className="font-serif text-[17px] font-black">{n}</span>
    </li>
  );
}
