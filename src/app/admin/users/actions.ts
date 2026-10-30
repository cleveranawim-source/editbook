"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current";
import { createUser, resetPassword } from "@/lib/users";
import { AppError } from "@/lib/errors";
import type { ActionState } from "@/app/login/actions";

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    await createUser({
      loginId: String(formData.get("loginId") ?? ""),
      name: String(formData.get("name") ?? ""),
      password: String(formData.get("password") ?? ""),
      isAdmin: formData.get("isAdmin") === "on",
    });
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/users");
  return {};
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    await resetPassword(
      String(formData.get("userId") ?? ""),
      String(formData.get("password") ?? ""),
    );
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/users");
  return {};
}
