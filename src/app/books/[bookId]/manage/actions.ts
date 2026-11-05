"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { prisma } from "@/lib/db";
import { addMember, getRole, removeMember } from "@/lib/books";
import { createPart, listParts, reorderParts, updatePart } from "@/lib/parts";
import { canManageBook } from "@/lib/permissions";
import { AppError } from "@/lib/errors";
import type { ActionState } from "@/app/login/actions";
import { notify, partUrl } from "@/lib/notify";
import type { User } from "@/generated/prisma/client";

async function authorize(bookId: string): Promise<User> {
  const user = await requireUser();
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  const role = await getRole(bookId, user.id);
  if (!book || !canManageBook(user, role, book.status)) notFound();
  return user;
}

async function notifyAssigned(actor: User, partId: string): Promise<void> {
  const part = await prisma.part.findUnique({ where: { id: partId }, include: { book: true } });
  if (!part?.assigneeUserId) return;
  await notify(
    [part.assigneeUserId],
    { kind: "assigned", title: `「${part.book.title}」 「${part.title}」 담당이 되었습니다 · ${actor.name}`, url: partUrl(part.bookId, part.id) },
    actor.id,
  );
}

async function run(bookId: string, fn: () => Promise<void>): Promise<ActionState> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/books/${bookId}/manage`);
  return {};
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function addMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookId = str(formData, "bookId");
  const actor = await authorize(bookId);
  const role = str(formData, "role") === "EDITOR" ? "EDITOR" : "AUTHOR";
  const userId = str(formData, "userId");
  return run(bookId, async () => {
    await addMember(bookId, userId, role);
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    await notify(
      [userId],
      { kind: "invited", title: `「${book?.title ?? "책"}」에 ${role === "EDITOR" ? "편집장" : "교사"}으로 초대되었습니다 · ${actor.name}`, url: `/books/${bookId}` },
      actor.id,
    );
  });
}

export async function removeMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookId = str(formData, "bookId");
  await authorize(bookId);
  return run(bookId, () => removeMember(bookId, str(formData, "userId")));
}

export async function createPartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookId = str(formData, "bookId");
  const actor = await authorize(bookId);
  return run(bookId, async () => {
    const created = await createPart({
      bookId,
      title: str(formData, "title"),
      assigneeUserId: str(formData, "assigneeUserId") || null,
    });
    await notifyAssigned(actor, created.id);
  });
}

export async function updatePartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookId = str(formData, "bookId");
  const actor = await authorize(bookId);
  const partId = str(formData, "partId");
  return run(bookId, async () => {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part || part.bookId !== bookId) throw new AppError("파트를 찾을 수 없습니다.");
    const data: { assigneeUserId?: string | null; title?: string; note?: string } = {};
    if (formData.has("assigneeUserId")) data.assigneeUserId = str(formData, "assigneeUserId") || null;
    if (formData.has("title")) data.title = str(formData, "title");
    if (formData.has("note")) data.note = str(formData, "note").trim();
    await updatePart(partId, data);
    if (data.assigneeUserId && data.assigneeUserId !== part.assigneeUserId) await notifyAssigned(actor, partId);
  });
}

export async function reorderPartsAction(bookId: string, orderedPartIds: string[]): Promise<ActionState> {
  await authorize(bookId);
  return run(bookId, () => reorderParts(bookId, orderedPartIds));
}

export async function movePartAction(
  bookId: string,
  partId: string,
  direction: "up" | "down",
): Promise<ActionState> {
  await authorize(bookId);
  return run(bookId, async () => {
    const ids = (await listParts(bookId)).map((p) => p.id);
    const i = ids.indexOf(partId);
    if (i < 0) throw new AppError("파트를 찾을 수 없습니다.");
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await reorderParts(bookId, ids);
  });
}
