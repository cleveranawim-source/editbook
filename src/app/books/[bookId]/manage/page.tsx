import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { prisma } from "@/lib/db";
import { getRole } from "@/lib/books";
import { listParts } from "@/lib/parts";
import { canManageBook } from "@/lib/permissions";
import { listUsers } from "@/lib/users";
import { BackLink } from "@/components/BackLink";
import { Card, CardBand, CardTitle } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { RoleTag } from "@/components/Tag";
import { TableHead } from "@/components/TableHead";
import { AddMemberForm, AssigneeForm, CreatePartForm, MoveButtons, PartEditForm, RemoveMemberForm } from "./forms";

/** 파트 관리 표의 열: 순서 / (제목·메모·저장) / 담당 / 순서 바꾸기. */
const PART_GRID = "lg:grid-cols-[56px_minmax(0,1fr)_200px_80px]";
/** 담당은 바꾸면 바로 저장된다: 제목·메모의 [저장] 묶음과 한 칸 더 띄워 따로 읽히게. */
const ASSIGNEE_GAP = "lg:ml-3";

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
    <div className="max-w-[1064px]">
      <BackLink href={`/books/${bookId}`} className="-mt-2">
        책 화면으로
      </BackLink>
      <PageHeader title={`${book.title} 관리`} className="mt-1" />

      <div className="flex flex-col gap-7">
        <Card as="section" aria-labelledby="members-heading">
          <CardTitle id="members-heading" count={`${members.length}명`} className="px-5 pb-4 pt-5 md:px-7">
            참여자
          </CardTitle>
          <ul className="border-t border-rule">
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex min-h-[52px] items-center gap-3 border-b border-rule px-5 py-2 last:border-b-0 md:px-7"
              >
                <span className="min-w-0 break-words font-bold">{m.user.name}</span>
                <RoleTag role={m.role} />
                <div className="ml-auto pl-6">
                  <RemoveMemberForm bookId={bookId} userId={m.userId} />
                </div>
              </li>
            ))}
          </ul>
          <CardBand title="참여자 추가">
            <AddMemberForm bookId={bookId} users={addable} />
          </CardBand>
        </Card>

        <Card as="section" aria-labelledby="parts-heading">
          <CardTitle id="parts-heading" count={`${parts.length}개`} className="px-5 pb-4 pt-5 md:px-7">
            파트
          </CardTitle>
          {parts.length === 0 ? (
            <EmptyState variant="inline">아직 파트가 없습니다. 아래 띠에서 첫 파트를 추가하세요.</EmptyState>
          ) : (
            <>
              <TableHead className={`gap-x-3 border-t pr-7 ${PART_GRID}`}>
                <span className="text-center">순서</span>
                <span className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_76px] gap-3">
                  <span>제목</span>
                  <span>메모</span>
                </span>
                <span className={ASSIGNEE_GAP}>담당</span>
                <span>순서 바꾸기</span>
              </TableHead>
              <ul className="border-t border-rule lg:border-t-0">
                {parts.map((p, i) => (
                  <li
                    key={p.id}
                    className={`grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-b border-rule px-5 py-4 last:border-b-0 md:px-7 lg:items-start lg:py-3 lg:pl-0 ${PART_GRID}`}
                  >
                    <span className="col-start-1 row-start-1 text-center font-serif text-[22px] font-black leading-none text-rb lg:flex lg:h-11 lg:items-center lg:justify-center">
                      <span className="sr-only">순서 </span>
                      {p.order}
                    </span>
                    <span className="col-start-2 row-start-1 min-w-0 break-words font-bold lg:hidden">{p.title}</span>
                    <MoveButtons
                      bookId={bookId}
                      partId={p.id}
                      first={i === 0}
                      last={i === parts.length - 1}
                      className="col-start-3 row-start-1 lg:col-start-4 lg:h-11 lg:justify-center"
                    />
                    <PartEditForm
                      bookId={bookId}
                      partId={p.id}
                      title={p.title}
                      note={p.note || null}
                      className="col-span-3 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1"
                    />
                    <AssigneeForm
                      bookId={bookId}
                      partId={p.id}
                      assigneeUserId={p.assigneeUserId}
                      members={memberOpts}
                      className={`col-span-3 row-start-3 lg:col-span-1 lg:col-start-3 lg:row-start-1 ${ASSIGNEE_GAP}`}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
          <CardBand title="파트 추가">
            <CreatePartForm bookId={bookId} members={memberOpts} />
          </CardBand>
        </Card>
      </div>
    </div>
  );
}
