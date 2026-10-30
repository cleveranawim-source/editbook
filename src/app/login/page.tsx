"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { Field, FormError, Input } from "@/components/Field";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <AuthCard title="로그인" lead="아이디와 비밀번호를 입력하세요.">
      <form action={action} className="flex flex-col gap-4">
        <Field label="아이디">
          <Input
            name="loginId"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={state.error ? true : undefined}
          />
        </Field>
        <Field label="비밀번호">
          <Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            aria-invalid={state.error ? true : undefined}
          />
        </Field>
        <FormError message={state.error} />
        <Button type="submit" variant="primary" pending={pending} pendingLabel="로그인 중…" className="mt-1 w-full">
          로그인
        </Button>
      </form>
    </AuthCard>
  );
}
