import Link from "next/link";
import type { Book } from "@/generated/prisma/client";
import { Card } from "@/components/Card";
import { cx } from "@/components/cx";

/** 책 화면 왼쪽 "내 책" 목록(넓은 화면 전용). 지금 책은 채운 칸 표시 + 굵게 + 틴트. */
export function BookNav({ books, currentId }: { books: { book: Book }[]; currentId: string }) {
  return (
    <Card as="nav" aria-label="내 책" className="hidden py-4 lg:sticky lg:top-7 lg:block">
      <h2 className="px-5 pb-2 text-sm font-bold text-ink-2">내 책</h2>
      <ul>
        {books.map(({ book }) => {
          const current = book.id === currentId;
          return (
            <li key={book.id}>
              <Link
                href={`/books/${book.id}`}
                aria-current={current ? "page" : undefined}
                className={cx(
                  "flex min-h-12 items-start gap-2.5 px-5 py-2.5 text-ink no-underline transition-colors hover:bg-rb-tint",
                  current && "bg-rb-tint",
                )}
              >
                <span aria-hidden className={cx("mt-[7px] size-2.5 shrink-0", current && "bg-rb")} />
                <span className="min-w-0">
                  <span className={cx("block leading-snug", current && "font-bold")}>{book.title}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-3">
                    {book.status === "ARCHIVED" ? "보관됨" : "진행 중"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
