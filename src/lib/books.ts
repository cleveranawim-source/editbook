import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Book, BookMember, BookRole, BookStatus, User } from "@/generated/prisma/client";

/** 책이 있고 보관되지 않았는지 확인한다. 아니면 AppError. */
export async function assertBookActive(bookId: string): Promise<void> {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw new AppError("책을 찾을 수 없습니다.");
  if (book.status === "ARCHIVED") throw new AppError("보관된 책은 바꿀 수 없습니다.");
}

export async function createBook(input: { title: string; editorUserId: string }): Promise<Book> {
  const title = input.title.trim();
  if (!title) throw new AppError("책 제목을 입력하세요.");
  const editor = await prisma.user.findUnique({ where: { id: input.editorUserId } });
  if (!editor) throw new AppError("편집장 계정을 찾을 수 없습니다.");
  return prisma.book.create({
    data: { title, members: { create: { userId: editor.id, role: "EDITOR" } } },
  });
}

export async function setBookStatus(bookId: string, status: BookStatus): Promise<void> {
  try {
    await prisma.book.update({ where: { id: bookId }, data: { status } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2025") throw new AppError("책을 찾을 수 없습니다.");
    throw e;
  }
}

export async function addMember(bookId: string, userId: string, role: BookRole): Promise<void> {
  await assertBookActive(bookId);
  if (!(await prisma.user.findUnique({ where: { id: userId } }))) {
    throw new AppError("계정을 찾을 수 없습니다.");
  }
  await prisma.bookMember.upsert({
    where: { bookId_userId: { bookId, userId } },
    create: { bookId, userId, role },
    update: { role },
  });
}

export async function removeMember(bookId: string, userId: string): Promise<void> {
  await assertBookActive(bookId);
  await prisma.$transaction(async (tx) => {
    const member = await tx.bookMember.findUnique({ where: { bookId_userId: { bookId, userId } } });
    if (!member) return;
    if (member.role === "EDITOR") {
      const editors = await tx.bookMember.count({ where: { bookId, role: "EDITOR" } });
      if (editors <= 1) throw new AppError("편집장은 한 명 이상 있어야 합니다.");
    }
    await tx.bookMember.delete({ where: { bookId_userId: { bookId, userId } } });
  });
}

export async function getRole(bookId: string, userId: string): Promise<BookRole | null> {
  const m = await prisma.bookMember.findUnique({ where: { bookId_userId: { bookId, userId } } });
  return m?.role ?? null;
}

export async function listAllBooks(): Promise<(Book & { members: (BookMember & { user: User })[] })[]> {
  return prisma.book.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { members: { include: { user: true } } },
  });
}
