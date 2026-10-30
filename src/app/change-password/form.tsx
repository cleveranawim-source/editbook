"use client";

import { useActionState } from "react";
import { changePasswordAction } from "./actions";
import { Button } from "@/components/Button";
import { Field, FormError, Input } from "@/components/Field";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="새 비밀번호" hint="8자 이상">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Field label="새 비밀번호 확인">
        <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <FormError message={state.error} />
      <Button type="submit" variant="primary" pending={pending} pendingLabel="바꾸는 중…" className="mt-1 w-full">
        비밀번호 변경
      </Button>
    </form>
  );
}
