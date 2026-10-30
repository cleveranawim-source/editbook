"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUserAction, resetPasswordAction } from "./actions";
import { Button } from "@/components/Button";
import { Field, FormError, InlineError, Input } from "@/components/Field";

function useResetOnSuccess(pending: boolean, error?: string) {
  const ref = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !error) ref.current?.reset();
    wasPending.current = pending;
  }, [pending, error]);
  return ref;
}

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, {});
  const ref = useResetOnSuccess(pending, state.error);
  return (
    <form
      ref={ref}
      action={action}
      className="grid gap-3 md:grid-cols-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:items-end"
    >
      <Field label="아이디">
        <Input name="loginId" required autoCapitalize="none" autoComplete="off" spellCheck={false} />
      </Field>
      <Field label="이름">
        <Input name="name" required autoComplete="off" />
      </Field>
      <Field label="임시 비밀번호(8자 이상)">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <label className="flex min-h-11 items-center gap-2.5 font-medium lg:px-2">
        <input name="isAdmin" type="checkbox" className="size-5 accent-rb" />
        관리자
      </label>
      <Button type="submit" variant="secondary" pending={pending} className="min-w-24 justify-self-start">
        만들기
      </Button>
      <FormError message={state.error} className="md:col-span-3 lg:col-span-5" />
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  const ref = useResetOnSuccess(pending, state.error);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-1">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex gap-2">
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="새 비밀번호"
          aria-label="새 비밀번호"
          autoComplete="new-password"
          className="flex-1"
        />
        <Button type="submit" variant="quiet" pending={pending} className="shrink-0">
          초기화
        </Button>
      </div>
      <InlineError message={state.error} />
    </form>
  );
}
