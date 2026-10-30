"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <main className="mx-auto w-full max-w-sm p-4">
      <h1 className="mb-4 text-xl font-bold">로그인</h1>
      <form action={action} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          아이디
          <input
            name="loginId"
            required
            autoComplete="username"
            autoCapitalize="none"
            className="rounded border border-gray-300 px-3 py-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
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
          로그인
        </button>
      </form>
    </main>
  );
}
