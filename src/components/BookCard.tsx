import Link from "next/link";
import type { Book, BookRole } from "@/generated/prisma/client";
import { cx } from "@/components/cx";
import { StatusBadge } from "@/components/StatusBadge";
import { RoleTag } from "@/components/Tag";

/**
 * 책 한 권. 카드 전체가 링크다. 보관된 책은 종이가 반쯤 비쳐 격자가 드러난다
 * (글자는 4.5:1 이상을 지키므로 opacity 대신 바탕만 옅게).
 */
export function BookCard({
  book, role, editorNames, memberCount, partCount, turns,
}: {
  book: Book;
  role: BookRole;
  editorNames: string[];
  memberCount: number;
  partCount: number;
  /** 보는 사람 기준 내 차례·상대 차례 파트 수 */
  turns?: { mine: number; theirs: number };
}) {
  const archived = book.status === "ARCHIVED";
  const teachers = memberCount - editorNames.length;
  return (
    <li className="min-w-0">
      <Link
        href={`/books/${book.id}`}
        className={cx(
          "flex h-full flex-col border border-rb-line p-5 no-underline transition-colors hover:border-rb",
          archived ? "bg-paper/60" : "bg-paper",
        )}
      >
        <h2 className={cx("font-serif text-xl font-bold leading-snug", archived ? "text-ink-2" : "text-ink")}>
          {book.title}
        </h2>
        <p className="mt-1.5 text-sm text-ink-2">
          편집장 {editorNames.join(", ") || "없음"} · 교사 {teachers}명 · 파트 {partCount}개
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          <RoleTag role={role} />
          {archived && <StatusBadge tone="gray">보관됨</StatusBadge>}
          {!archived && turns && turns.mine > 0 && <StatusBadge tone="red">내 차례 {turns.mine}</StatusBadge>}
          {!archived && turns && turns.theirs > 0 && <StatusBadge tone="yellow">상대 차례 {turns.theirs}</StatusBadge>}
        </div>
      </Link>
    </li>
  );
}
