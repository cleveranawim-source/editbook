import { requireAdmin } from "@/lib/auth/current";
import { listUsers } from "@/lib/users";
import { Card, CardBand, CardTitle } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Tag } from "@/components/Tag";
import { TableHead } from "@/components/TableHead";
import { CreateUserForm, ResetPasswordForm } from "./forms";

const USER_GRID = "lg:grid-cols-[176px_148px_minmax(0,1fr)_340px]";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listUsers();
  return (
    <div className="max-w-[1064px]">
      <PageHeader title="계정 관리" />

      <Card as="section" aria-labelledby="users-heading">
        <CardTitle id="users-heading" count={`${users.length}명`} className="px-5 pb-4 pt-5 md:px-7">
          계정 목록
        </CardTitle>
        <TableHead className={`gap-x-4 border-t px-7 ${USER_GRID}`}>
          <span>아이디</span>
          <span>이름</span>
          <span>구분</span>
          <span>비밀번호 초기화</span>
        </TableHead>
        <ul className="border-t border-rule lg:border-t-0">
          {users.map((u) => (
            <li
              key={u.id}
              className={`grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2.5 border-b border-rule px-5 py-4 last:border-b-0 md:px-7 lg:min-h-14 lg:items-center lg:gap-x-4 lg:py-1.5 ${USER_GRID}`}
            >
              <span className="font-bold lg:order-2">{u.name}</span>
              <span className="min-w-0 break-all text-[15px] text-ink-2 lg:order-1 lg:text-ink">
                <span className="sr-only">아이디 </span>
                {u.loginId}
              </span>
              <span className="col-span-2 flex flex-wrap gap-1.5 empty:hidden lg:order-3 lg:col-span-1 lg:empty:flex">
                {u.isAdmin && <Tag>관리자</Tag>}
                {u.mustChangePassword && <StatusBadge tone="yellow">첫 로그인 전</StatusBadge>}
              </span>
              <div className="col-span-2 lg:order-4 lg:col-span-1">
                <ResetPasswordForm userId={u.id} />
              </div>
            </li>
          ))}
        </ul>
        <CardBand title="계정 만들기">
          <CreateUserForm />
        </CardBand>
      </Card>
    </div>
  );
}
