"use client";

import Link from "next/link";

import { useActionState, useEffect, useRef, useTransition } from "react";
import {
  addMemberAction, createPartAction, movePartAction, removeMemberAction, updatePartAction,
} from "./actions";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { Field, FormError, InlineError, Input, Select } from "@/components/Field";
import { ChevronDown, ChevronUp } from "@/components/icons";

type Opt = { id: string; label: string };

function useResetOnSuccess(pending: boolean, error?: string) {
  const ref = useRef<HTMLFormElement>(null);
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending && !error) ref.current?.reset();
    was.current = pending;
  }, [pending, error]);
  return ref;
}

export function AddMemberForm({ bookId, users, isAdmin }: { bookId: string; users: Opt[]; isAdmin: boolean }) {
  const [state, action, pending] = useActionState(addMemberAction, {});
  const ref = useResetOnSuccess(pending, state.error);
  const none = users.length === 0;
  const noneHint = none
    ? isAdmin
      ? (
          <>
            모든 계정이 이미 이 책에 있습니다.{" "}
            <Link href="/admin/users" className="font-bold text-ink underline hover:text-rb">
              계정 관리
            </Link>
            에서 새 계정을 먼저 만드세요.
          </>
        )
      : "모든 계정이 이미 이 책에 있습니다. 새 선생님은 관리자에게 계정 만들기를 부탁하세요."
    : undefined;
  return (
    <form ref={ref} action={action} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
      <input type="hidden" name="bookId" value={bookId} />
      <Field label="계정" hint={noneHint}>
        <Select name="userId" required defaultValue="" disabled={none}>
          <option value="" disabled>
            {none ? "추가할 계정이 없습니다" : "선택하세요"}
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="역할">
        <Select name="role" defaultValue="AUTHOR" disabled={none}>
          <option value="EDITOR">편집장</option>
          <option value="AUTHOR">교사</option>
        </Select>
      </Field>
      <Button type="submit" variant="secondary" pending={pending} disabled={none} className="min-w-24">
        추가
      </Button>
      <FormError message={state.error} className="md:col-span-3" />
    </form>
  );
}

export function RemoveMemberForm({ bookId, userId }: { bookId: string; userId: string }) {
  const [state, action, pending] = useActionState(removeMemberAction, {});
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="quietDanger" size="sm" pending={pending}>
        제거
      </Button>
      <InlineError message={state.error} className="text-right" />
    </form>
  );
}

export function CreatePartForm({ bookId, members }: { bookId: string; members: Opt[] }) {
  const [state, action, pending] = useActionState(createPartAction, {});
  const ref = useResetOnSuccess(pending, state.error);
  return (
    <form ref={ref} action={action} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
      <input type="hidden" name="bookId" value={bookId} />
      <Field label="제목">
        <Input name="title" required autoComplete="off" placeholder="예: 4단원 종교와 삶" />
      </Field>
      <Field label="담당">
        <Select name="assigneeUserId" defaultValue="">
          <option value="">담당 없음</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" variant="secondary" pending={pending} className="min-w-24">
        추가
      </Button>
      <FormError message={state.error} className="md:col-span-3" />
    </form>
  );
}

export function AssigneeForm({
  bookId, partId, assigneeUserId, members, className,
}: { bookId: string; partId: string; assigneeUserId: string | null; members: Opt[]; className?: string }) {
  const [state, action, pending] = useActionState(updatePartAction, {});
  return (
    <form action={action} className={cx("flex flex-col gap-1", className)}>
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="partId" value={partId} />
      <Field label="담당" labelClassName="lg:sr-only">
        <Select
          name="assigneeUserId"
          defaultValue={assigneeUserId ?? ""}
          disabled={pending}
          aria-busy={pending || undefined}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          <option value="">담당 없음</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <InlineError message={state.error} />
    </form>
  );
}

export function PartEditForm({
  bookId, partId, title, note, className,
}: { bookId: string; partId: string; title: string; note: string | null; className?: string }) {
  const [state, action, pending] = useActionState(updatePartAction, {});
  return (
    <form
      action={action}
      className={cx("grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_76px] lg:items-start", className)}
    >
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="partId" value={partId} />
      <Field label="제목" labelClassName="lg:sr-only">
        <Input name="title" required defaultValue={title} autoComplete="off" />
      </Field>
      <Field label="메모" labelClassName="lg:sr-only">
        <Input name="note" defaultValue={note ?? ""} autoComplete="off" />
      </Field>
      <Button type="submit" variant="secondary" pending={pending} className="min-w-24 justify-self-start lg:w-full lg:min-w-0">
        저장
      </Button>
      <InlineError message={state.error} className="lg:col-span-3" />
    </form>
  );
}

export function MoveButtons({
  bookId, partId, first, last, className,
}: { bookId: string; partId: string; first: boolean; last: boolean; className?: string }) {
  const [state, action] = useActionState(
    async (_prev: { error?: string }, dir: "up" | "down") => movePartAction(bookId, partId, dir),
    {},
  );
  const [pending, startTransition] = useTransition();
  const move = (dir: "up" | "down") => startTransition(() => action(dir));
  return (
    <div className={cx("flex flex-col items-end gap-1", className)}>
      <div className="flex gap-2">
        <Button
          aria-label="위로"
          disabled={pending || first}
          aria-busy={pending || undefined}
          onClick={() => move("up")}
          square
        >
          <ChevronUp />
        </Button>
        <Button
          aria-label="아래로"
          disabled={pending || last}
          aria-busy={pending || undefined}
          onClick={() => move("down")}
          square
        >
          <ChevronDown />
        </Button>
      </div>
      <InlineError message={state.error} className="text-right" />
    </div>
  );
}
