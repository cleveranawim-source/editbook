"use client";

import { useActionState } from "react";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        새 비밀번호
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded border border-gray-300 px-3 py-2 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        새 비밀번호 확인
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded border border-gray-300 px-3 py-2 text-base"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
      >
        변경
      </button>
    </form>
  );
}
