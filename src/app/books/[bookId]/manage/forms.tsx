"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  addMemberAction, createPartAction, movePartAction, removeMemberAction, updatePartAction,
} from "./actions";

const input = "rounded border border-gray-300 px-3 py-2 text-base";
const btn = "rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60";

type Opt = { id: string; label: string };

function Err({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm text-red-600">
      {message}
    </p>
  ) : null;
}

function useResetOnSuccess(pending: boolean, error?: string) {
  const ref = useRef<HTMLFormElement>(null);
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending && !error) ref.current?.reset();
    was.current = pending;
  }, [pending, error]);
  return ref;
}

export function AddMemberForm({ bookId, users }: { bookId: string; users: Opt[] }) {
  const [state, action, pending] = useActionState(addMemberAction, {});
  const ref = useResetOnSuccess(pending, state.error);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="bookId" value={bookId} />
      <label className="flex flex-col gap-1 text-sm">
        계정
        <select name="userId" required defaultValue="" className={input}>
          <option value="" disabled>
            선택하세요
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        역할
        <select name="role" defaultValue="AUTHOR" className={input}>
          <option value="EDITOR">편집장</option>
          <option value="AUTHOR">교사</option>
        </select>
      </label>
      <Err message={state.error} />
      <button type="submit" disabled={pending} className={btn}>
        추가
      </button>
    </form>
  );
}

export function RemoveMemberForm({ bookId, userId }: { bookId: string; userId: string }) {
  const [state, action, pending] = useActionState(removeMemberAction, {});
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className="rounded bg-gray-700 px-3 py-2 text-white disabled:opacity-60">
        제거
      </button>
      <Err message={state.error} />
    </form>
  );
}

export function CreatePartForm({ bookId, members }: { bookId: string; members: Opt[] }) {
  const [state, action, pending] = useActionState(createPartAction, {});
  const ref = useResetOnSuccess(pending, state.error);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="bookId" value={bookId} />
      <label className="flex flex-col gap-1 text-sm">
        제목
        <input name="title" required autoComplete="off" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        담당
        <select name="assigneeUserId" defaultValue="" className={input}>
          <option value="">담당 없음</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <Err message={state.error} />
      <button type="submit" disabled={pending} className={btn}>
        추가
      </button>
    </form>
  );
}

export function AssigneeForm({
  bookId, partId, assigneeUserId, members,
}: { bookId: string; partId: string; assigneeUserId: string | null; members: Opt[] }) {
  const [state, action, pending] = useActionState(updatePartAction, {});
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="partId" value={partId} />
      <label className="flex flex-col gap-1 text-sm">
        담당
        <select
          name="assigneeUserId"
          defaultValue={assigneeUserId ?? ""}
          disabled={pending}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={input}
        >
          <option value="">담당 없음</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <Err message={state.error} />
    </form>
  );
}

export function MoveButtons({
  bookId, partId, first, last,
}: { bookId: string; partId: string; first: boolean; last: boolean }) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string }, dir: "up" | "down") => movePartAction(bookId, partId, dir),
    {},
  );
  const b = "rounded bg-gray-200 px-3 py-2 disabled:opacity-40";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button type="button" aria-label="위로" disabled={pending || first} onClick={() => action("up")} className={b}>
          ▲
        </button>
        <button type="button" aria-label="아래로" disabled={pending || last} onClick={() => action("down")} className={b}>
          ▼
        </button>
      </div>
      <Err message={state.error} />
    </div>
  );
}
