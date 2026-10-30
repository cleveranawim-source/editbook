import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertBookActive } from "@/lib/books";
import type { Part, User } from "@/generated/prisma/client";

async function assertAssignee(bookId: string, userId: string | null | undefined): Promise<void> {
  if (userId == null) return;
  const m = await prisma.bookMember.findUnique({ where: { bookId_userId: { bookId, userId } } });
  if (!m) throw new AppError("이 책의 참여자가 아닙니다.");
}

export async function createPart(input: {
  bookId: string;
  title: string;
  assigneeUserId?: string | null;
  note?: string;
}): Promise<Part> {
  await assertBookActive(input.bookId);
  const title = input.title.trim();
  if (!title) throw new AppError("파트 제목을 입력하세요.");
  await assertAssignee(input.bookId, input.assigneeUserId);
  return prisma.$transaction(async (tx) => {
    const max = await tx.part.aggregate({ where: { bookId: input.bookId }, _max: { order: true } });
    return tx.part.create({
      data: {
        bookId: input.bookId,
        order: (max._max.order ?? 0) + 1,
        title,
        note: input.note ?? "",
        assigneeUserId: input.assigneeUserId ?? null,
      },
    });
  });
}

export async function updatePart(
  partId: string,
  patch: { title?: string; note?: string; assigneeUserId?: string | null },
): Promise<Part> {
  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part) throw new AppError("파트를 찾을 수 없습니다.");
  await assertBookActive(part.bookId);
  const data: { title?: string; note?: string; assigneeUserId?: string | null } = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new AppError("파트 제목을 입력하세요.");
    data.title = title;
  }
  if (patch.note !== undefined) data.note = patch.note;
  if (patch.assigneeUserId !== undefined) {
    await assertAssignee(part.bookId, patch.assigneeUserId);
    data.assigneeUserId = patch.assigneeUserId;
  }
  return prisma.part.update({ where: { id: partId }, data });
}

export async function reorderParts(bookId: string, orderedPartIds: string[]): Promise<void> {
  await assertBookActive(bookId);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.part.findMany({ where: { bookId }, select: { id: true } });
    const given = new Set(orderedPartIds);
    if (
      given.size !== orderedPartIds.length ||
      existing.length !== orderedPartIds.length ||
      !existing.every((p) => given.has(p.id))
    ) {
      throw new AppError("파트 목록이 맞지 않습니다.");
    }
    for (const [i, id] of orderedPartIds.entries()) {
      await tx.part.update({ where: { id }, data: { order: -(i + 1) } });
    }
    for (const [i, id] of orderedPartIds.entries()) {
      await tx.part.update({ where: { id }, data: { order: i + 1 } });
    }
  });
}

export async function listParts(bookId: string): Promise<(Part & { assignee: User | null })[]> {
  return prisma.part.findMany({
    where: { bookId },
    orderBy: { order: "asc" },
    include: { assignee: true },
  });
}
