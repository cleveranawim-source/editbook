import { requireAdmin } from "@/lib/auth/current";
import { listUsers } from "@/lib/users";
import { CreateUserForm, ResetPasswordForm } from "./forms";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listUsers();
  return (
    <main className="mx-auto w-full max-w-xl p-4">
      <h1 className="mb-4 text-xl font-bold">계정 관리</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">계정 만들기</h2>
        <div className="max-w-sm">
          <CreateUserForm />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">계정 목록</h2>
        <ul className="flex flex-col gap-3">
          {users.map((u) => (
            <li key={u.id} className="rounded border border-gray-300 p-3">
              <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-semibold">{u.name}</span>
                <span className="break-all text-sm text-gray-600">{u.loginId}</span>
                {u.isAdmin && <span className="text-sm text-blue-700">관리자</span>}
                {u.mustChangePassword && <span className="text-sm text-amber-700">첫 로그인 전</span>}
              </div>
              <ResetPasswordForm userId={u.id} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
