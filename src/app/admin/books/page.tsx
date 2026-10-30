import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current";
import { listAllBooks } from "@/lib/books";
import { listUsers } from "@/lib/users";
import { BookStatusForm, CreateBookForm } from "./forms";

export default async function AdminBooksPage() {
  await requireAdmin();
  const [books, users] = await Promise.all([listAllBooks(), listUsers()]);
  return (
    <main className="mx-auto w-full max-w-xl p-4">
      <h1 className="mb-4 text-xl font-bold">책 관리</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">책 만들기</h2>
        <div className="max-w-sm">
          <CreateBookForm users={users.map((u) => ({ id: u.id, name: u.name, loginId: u.loginId }))} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">책 목록</h2>
        {books.length === 0 && <p className="text-sm text-gray-600">아직 책이 없습니다.</p>}
        <ul className="flex flex-col gap-3">
          {books.map((b) => {
            const archived = b.status === "ARCHIVED";
            const editors = b.members.filter((m) => m.role === "EDITOR").map((m) => m.user.name);
            return (
              <li key={b.id} className="rounded border border-gray-300 p-3">
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={`/books/${b.id}`} className="break-words font-semibold text-blue-700 underline">
                    {b.title}
                  </Link>
                  <span className={`text-sm ${archived ? "text-gray-600" : "text-green-700"}`}>
                    {archived ? "보관됨" : "진행 중"}
                  </span>
                </div>
                <p className="mb-2 break-words text-sm text-gray-600">편집장: {editors.join(", ") || "없음"}</p>
                <BookStatusForm bookId={b.id} archived={archived} />
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
