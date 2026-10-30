import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { getBookForViewer } from "@/lib/books";
import { listParts } from "@/lib/parts";
import { canManageBook } from "@/lib/permissions";
import { PartRow } from "@/components/PartRow";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const user = await requireUser();
  const found = await getBookForViewer(bookId, user);
  if (!found) notFound();
  const { book, role } = found;
  const parts = await listParts(bookId);
  return (
    <main className="mx-auto w-full max-w-xl p-4">
      <Link href="/books" className="text-sm text-blue-700 underline">내 책으로 돌아가기</Link>
      <h1 className="mb-2 mt-2 break-words text-xl font-bold">{book.title}</h1>
      {canManageBook(user, role, book.status) && (
        <p className="mb-4 text-sm">
          <Link href={`/books/${bookId}/manage`} className="text-blue-700 underline">참여자·파트 관리</Link>
        </p>
      )}
      {parts.length === 0 && <p className="text-sm text-gray-600">아직 파트가 없습니다.</p>}
      <ul className="flex flex-col gap-3">
        {parts.map((p) => (
          <PartRow key={p.id} part={p} mine={p.assigneeUserId === user.id} />
        ))}
      </ul>
    </main>
  );
}
