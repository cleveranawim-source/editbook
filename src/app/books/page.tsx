import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { listBooksForUser } from "@/lib/books";
import { BookCard } from "@/components/BookCard";

export default async function BooksPage() {
  const user = await requireUser();
  const books = await listBooksForUser(user.id);
  return (
    <main className="mx-auto w-full max-w-xl p-4">
      <h1 className="mb-4 text-xl font-bold">내 책</h1>
      {books.length === 0 && <p className="text-sm text-gray-600">참여 중인 책이 없습니다.</p>}
      <ul className="flex flex-col gap-3">
        {books.map((b) => (
          <BookCard key={b.book.id} {...b} />
        ))}
      </ul>
      {user.isAdmin && (
        <p className="mt-6 text-sm text-gray-600">
          관리자: <Link href="/admin/users" className="text-blue-700 underline">계정 관리</Link>
          {" · "}
          <Link href="/admin/books" className="text-blue-700 underline">책 관리</Link>
        </p>
      )}
    </main>
  );
}
