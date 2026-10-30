import { requireUser } from "@/lib/auth/current";
import { ChangePasswordForm } from "./form";

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChangePending: true });
  return (
    <main className="mx-auto w-full max-w-sm p-4">
      <h1 className="mb-2 text-xl font-bold">비밀번호 변경</h1>
      {user.mustChangePassword && (
        <p className="mb-4 text-sm text-gray-600">
          처음 로그인하셨습니다. 새 비밀번호를 정해 주세요(8자 이상).
        </p>
      )}
      <ChangePasswordForm />
    </main>
  );
}
