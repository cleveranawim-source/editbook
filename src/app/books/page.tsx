import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { listBooksForUser } from "@/lib/books";
import { BookCard } from "@/components/BookCard";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

const adminLink =
  "inline-flex min-h-11 items-center px-1 font-medium text-ink underline transition-colors hover:text-rb";

export default async function BooksPage() {
  const user = await requireUser();
  const books = await listBooksForUser(user.id);
  return (
    <>
      <PageHeader title="내 책" count={books.length > 0 ? `${books.length}권` : undefined}>
        {user.isAdmin && (
          <p className="-mb-2 mt-1 flex flex-wrap items-center gap-x-1 text-sm text-ink-2">
            <span className="mr-1">관리자:</span>
            <Link href="/admin/users" className={adminLink}>
              계정 관리
            </Link>
            <span aria-hidden>·</span>
            <Link href="/admin/books" className={adminLink}>
              책 관리
            </Link>
          </p>
        )}
      </PageHeader>

      {books.length === 0 ? (
        <EmptyState>참여 중인 책이 없습니다. 편집장이나 관리자가 책에 초대하면 여기 보입니다.</EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
          {books.map((b) => (
            <BookCard key={b.book.id} {...b} />
          ))}
        </ul>
      )}
    </>
  );
}
