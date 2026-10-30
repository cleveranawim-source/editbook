import type { BookRole, BookStatus } from "@/generated/prisma/client";

export type Actor = { id: string; isAdmin: boolean };

export function canViewBook(actor: Actor, role: BookRole | null): boolean {
  return actor.isAdmin || role !== null;
}

export function canManageBook(
  actor: Actor,
  role: BookRole | null,
  bookStatus: BookStatus,
): boolean {
  return bookStatus === "ACTIVE" && (actor.isAdmin || role === "EDITOR");
}

export function canEditPart(
  actor: Actor,
  role: BookRole | null,
  bookStatus: BookStatus,
  part: { assigneeUserId: string | null },
): boolean {
  return (
    bookStatus === "ACTIVE" &&
    role !== null &&
    (role === "EDITOR" || part.assigneeUserId === actor.id)
  );
}
