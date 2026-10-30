import { requireUser } from "@/lib/auth/current";
import { AuthCard } from "@/components/AuthCard";
import { ChangePasswordForm } from "./form";

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChangePending: true });
  return (
    <AuthCard
      title="새 비밀번호 설정"
      lead={user.mustChangePassword ? "첫 로그인입니다. 새 비밀번호를 정해 주세요." : "새 비밀번호를 정해 주세요."}
    >
      <ChangePasswordForm />
    </AuthCard>
  );
}
