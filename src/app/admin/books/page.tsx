import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current";
import { listAllBooks } from "@/lib/books";
import { listUsers } from "@/lib/users";
import { Card, CardBand, CardTitle } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Tag } from "@/components/Tag";
import { TableHead } from "@/components/TableHead";
import { BookStatusForm, CreateBookForm } from "./forms";

const BOOK_GRID = "lg:grid-cols-[minmax(0,1fr)_112px_200px_96px]";

export default async function AdminBooksPage() {
  await requireAdmin();
  const [books, users] = await Promise.all([listAllBooks(), listUsers()]);
  return (
    <div className="max-w-[1064px]">
      <PageHeader title="책 관리" />

      <Card as="section" aria-labelledby="books-heading">
        <CardTitle id="books-heading" count={`${books.length}권`} className="px-5 pb-4 pt-5 md:px-7">
          책 목록
        </CardTitle>
        {books.length === 0 ? (
          <EmptyState variant="inline">아직 책이 없습니다. 아래 띠에서 첫 책을 만드세요.</EmptyState>
        ) : (
          <>
            <TableHead className={`gap-x-4 border-t px-7 ${BOOK_GRID}`}>
              <span>제목</span>
              <span>상태</span>
              <span>편집장</span>
              <span />
            </TableHead>
            <ul className="border-t border-rule lg:border-t-0">
              {books.map((b) => {
                const archived = b.status === "ARCHIVED";
                const editors = b.members.filter((m) => m.role === "EDITOR").map((m) => m.user.name);
                return (
                  <li
                    key={b.id}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-rule px-5 py-4 last:border-b-0 md:px-7 lg:min-h-14 lg:py-1.5 ${BOOK_GRID}`}
                  >
                    <Link
                      href={`/books/${b.id}`}
                      className="col-span-2 min-w-0 justify-self-start py-1 font-serif text-lg font-bold leading-snug text-ink underline lg:col-span-1"
                    >
                      {b.title}
                    </Link>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:contents">
                      <span>{archived ? <StatusBadge tone="gray">보관됨</StatusBadge> : <Tag>진행 중</Tag>}</span>
                      <span className="min-w-0 break-words text-sm text-ink-2 lg:text-[15px] lg:text-ink">
                        <span className="lg:sr-only">편집장 </span>
                        {editors.join(", ") || "없음"}
                      </span>
                    </span>
                    <BookStatusForm bookId={b.id} archived={archived} />
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <CardBand title="책 만들기">
          <CreateBookForm users={users.map((u) => ({ id: u.id, name: u.name, loginId: u.loginId }))} />
        </CardBand>
      </Card>
    </div>
  );
}
