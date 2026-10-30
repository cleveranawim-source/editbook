import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { prisma } from "@/lib/db";
import { getRole } from "@/lib/books";
import { listParts } from "@/lib/parts";
import { canManageBook } from "@/lib/permissions";
import { listUsers } from "@/lib/users";
import { AddMemberForm, AssigneeForm, CreatePartForm, MoveButtons, RemoveMemberForm } from "./forms";

export default async function ManagePage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const user = await requireUser();
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  const role = await getRole(bookId, user.id);
  if (!book || !canManageBook(user, role, book.status)) notFound();

  const [members, parts, users] = await Promise.all([
    prisma.bookMember.findMany({ where: { bookId }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
    listParts(bookId),
    listUsers(),
  ]);
  const memberIds = new Set(members.map((m) => m.userId));
  const addable = users
    .filter((u) => !memberIds.has(u.id))
    .map((u) => ({ id: u.id, label: `${u.name} (${u.loginId})` }));
  const memberOpts = members.map((m) => ({ id: m.userId, label: m.user.name }));

  return (
    <main className="mx-auto w-full max-w-xl p-4">
      <Link href={`/books/${bookId}`} className="text-sm text-blue-700 underline">
        책으로 돌아가기
      </Link>
      <h1 className="mb-4 mt-2 break-words text-xl font-bold">{book.title}</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">참여자</h2>
        <ul className="mb-4 flex flex-col gap-3">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between gap-3 rounded border border-gray-300 p-3">
              <div className="min-w-0">
                <p className="break-words font-semibold">{m.user.name}</p>
                <p className="text-sm text-gray-600">{m.role === "EDITOR" ? "편집장" : "교사"}</p>
              </div>
              <RemoveMemberForm bookId={bookId} userId={m.userId} />
            </li>
          ))}
        </ul>
        <h3 className="mb-2 font-semibold">참여자 추가</h3>
        <div className="max-w-sm">
          <AddMemberForm bookId={bookId} users={addable} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">파트</h2>
        {parts.length === 0 && <p className="mb-4 text-sm text-gray-600">아직 파트가 없습니다.</p>}
        <ul className="mb-4 flex flex-col gap-3">
          {parts.map((p, i) => (
            <li key={p.id} className="flex flex-col gap-2 rounded border border-gray-300 p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-600">{p.order}</span>
                <span className="min-w-0 break-words font-semibold">{p.title}</span>
              </div>
              {p.note && <p className="break-words text-sm text-gray-600">{p.note}</p>}
              <AssigneeForm bookId={bookId} partId={p.id} assigneeUserId={p.assigneeUserId} members={memberOpts} />
              <MoveButtons bookId={bookId} partId={p.id} first={i === 0} last={i === parts.length - 1} />
            </li>
          ))}
        </ul>
        <h3 className="mb-2 font-semibold">파트 추가</h3>
        <div className="max-w-sm">
          <CreatePartForm bookId={bookId} members={memberOpts} />
        </div>
      </section>
    </main>
  );
}
