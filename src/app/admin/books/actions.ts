"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current";
import { createBook, setBookStatus } from "@/lib/books";
import { AppError } from "@/lib/errors";
import type { ActionState } from "@/app/login/actions";

export async function createBookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    await createBook({
      title: String(formData.get("title") ?? ""),
      editorUserId: String(formData.get("editorUserId") ?? ""),
    });
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
