"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current";
import { createBook, setBookStatus } from "@/lib/books";
import { AppError } from "@/lib/errors";
import type { ActionState } from "@/app/login/actions";
import { notify } from "@/lib/notify";

export async function createBookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const book = await createBook({
      title: String(formData.get("title") ?? ""),
      editorUserId: String(formData.get("editorUserId") ?? ""),
    });
    await notify(
      [String(formData.get("editorUserId") ?? "")],
      { kind: "invited", title: `「${book.title}」의 편집장이 되었습니다 · ${admin.name}`, url: `/books/${book.id}` },
      admin.id,
    );
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/books");
  return {};
}

export async function setBookStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const status = formData.get("status") === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
  try {
    await setBookStatus(String(formData.get("bookId") ?? ""), status);
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/books");
  return {};
}
