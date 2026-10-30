"use client";

import { useActionState, useEffect, useRef } from "react";
import type { User } from "@/generated/prisma/client";
import { createBookAction, setBookStatusAction } from "./actions";
import { Button } from "@/components/Button";
import { Field, FormError, InlineError, Input, Select } from "@/components/Field";

export function CreateBookForm({ users }: { users: Pick<User, "id" | "name" | "loginId">[] }) {
  const [state, action, pending] = useActionState(createBookAction, {});
  const ref = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) ref.current?.reset();
    wasPending.current = pending;
  }, [pending, state.error]);
  return (
    <form ref={ref} action={action} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px_auto] md:items-end">
      <Field label="제목">
        <Input name="title" required autoComplete="off" placeholder="예: 중학교 종교 2" />
      </Field>
      <Field label="편집장">
        <Select name="editorUserId" required defaultValue="">
          <option value="" disabled>
            선택하세요
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.loginId})
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" variant="secondary" pending={pending} className="min-w-24 justify-self-start">
        만들기
      </Button>
      <FormError message={state.error} className="md:col-span-3" />
    </form>
  );
}

export function BookStatusForm({ bookId, archived }: { bookId: string; archived: boolean }) {
  const [state, action, pending] = useActionState(setBookStatusAction, {});
  return (
    <form action={action} className="flex flex-col items-start gap-1 lg:items-end">
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="status" value={archived ? "ACTIVE" : "ARCHIVED"} />
      <Button type="submit" variant="secondary" pending={pending} className="min-w-20">
        {archived ? "복원" : "보관"}
      </Button>
      <InlineError message={state.error} />
    </form>
  );
}
