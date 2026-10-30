"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUserAction, resetPasswordAction } from "./actions";

const input = "rounded border border-gray-300 px-3 py-2 text-base";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, {});
  const ref = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) ref.current?.reset();
    wasPending.current = pending;
  }, [pending, state.error]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        아이디
        <input name="loginId" required autoCapitalize="none" autoComplete="off" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        이름
        <input name="name" required autoComplete="off" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        임시 비밀번호
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="isAdmin" type="checkbox" className="h-4 w-4" />
        관리자
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60">
        만들기
      </button>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  const ref = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) ref.current?.reset();
    wasPending.current = pending;
  }, [pending, state.error]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex gap-2">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="새 비밀번호"
          aria-label="새 비밀번호"
          autoComplete="new-password"
          className={`${input} min-w-0 flex-1`}
        />
        <button type="submit" disabled={pending} className="shrink-0 rounded bg-gray-700 px-3 py-2 text-white disabled:opacity-60">
          초기화
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
