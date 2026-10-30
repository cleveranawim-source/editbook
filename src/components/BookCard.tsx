import Link from "next/link";
import type { Book, BookRole } from "@/generated/prisma/client";
import { StatusBadge } from "@/components/StatusBadge";

export function BookCard({
  book, role, editorNames, memberCount, partCount,
}: {
  book: Book;
  role: BookRole;
  editorNames: string[];
  memberCount: number;
  partCount: number;
}) {
  const archived = book.status === "ARCHIVED";
  const teachers = memberCount - editorNames.length;
  return (
    <li className={`rounded border border-gray-300 p-3 ${archived ? "opacity-60" : ""}`}>
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link href={`/books/${book.id}`} className="min-w-0 break-words font-semibold text-blue-700 underline">
          {book.title}
        </Link>
        <StatusBadge tone="gray">{role === "EDITOR" ? "편집장" : "교사"}</StatusBadge>
        {archived && <StatusBadge tone="gray">보관됨</StatusBadge>}
      </div>
      <p className="break-words text-sm text-gray-600">
        편집장 {editorNames.join(", ") || "없음"} · 교사 {teachers}명 · 파트 {partCount}개
      </p>
    </li>
  );
}
