import { requireUser } from "@/lib/auth/current";
import { listBooksForUser } from "@/lib/books";
import { turnSummaryForBooks } from "@/lib/requests";
import { BookCard } from "@/components/BookCard";
import { ButtonLink } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export default async function BooksPage() {
  const user = await requireUser();
  const books = await listBooksForUser(user.id);
  const turns = await turnSummaryForBooks(user, new Map(books.map((b) => [b.book.id, b.role])));
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
        <PageHeader title="내 책" count={books.length > 0 ? `${books.length}권` : undefined} className="mb-0" />
        {user.isAdmin && (
          <section aria-labelledby="admin-heading" className="shrink-0">
            <h2 id="admin-heading" className="sr-only">
              관리자 메뉴
            </h2>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin/users" variant="primary" className="flex-1 md:flex-none">
                계정 관리
              </ButtonLink>
              <ButtonLink href="/admin/books" variant="primary" className="flex-1 md:flex-none">
                책 관리
              </ButtonLink>
            </div>
            <p className="mt-2 text-[13px] leading-snug text-ink-2 md:text-right">
              선생님 계정은 계정 관리에서, 책은 책 관리에서 만듭니다.
            </p>
          </section>
        )}
      </div>

      {books.length === 0 ? (
        <EmptyState>참여 중인 책이 없습니다. 편집장이나 관리자가 책에 초대하면 여기 보입니다.</EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
          {books.map((b) => (
            <BookCard key={b.book.id} {...b} turns={turns.get(b.book.id)} />
          ))}
        </ul>
      )}
    </>
  );
}
