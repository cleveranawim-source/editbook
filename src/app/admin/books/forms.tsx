"use client";

import { useActionState, useEffect, useRef } from "react";
import type { User } from "@/generated/prisma/client";
import { createBookAction, setBookStatusAction } from "./actions";

const input = "rounded border border-gray-300 px-3 py-2 text-base";

export function CreateBookForm({ users }: { users: Pick<User, "id" | "name" | "loginId">[] }) {
  const [state, action, pending] = useActionState(createBookAction, {});
  const ref = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) ref.current?.reset();
    wasPending.current = pending;
  }, [pending, state.error]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        제목
        <input name="title" required autoComplete="off" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        편집장
        <select name="editorUserId" required defaultValue="" className={input}>
          <option value="" disabled>
            선택하세요
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.loginId})
            </option>
          ))}
        </select>
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

export function BookStatusForm({ bookId, archived }: { bookId: string; archived: boolean }) {
  const [state, action, pending] = useActionState(setBookStatusAction, {});
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="status" value={archived ? "ACTIVE" : "ARCHIVED"} />
      <button type="submit" disabled={pending} className="rounded bg-gray-700 px-3 py-2 text-white disabled:opacity-60">
        {archived ? "복원" : "보관"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
