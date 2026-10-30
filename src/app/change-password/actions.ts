"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { SESSION_COOKIE, createSession } from "@/lib/auth/session";
import { changePassword } from "@/lib/users";
import { AppError } from "@/lib/errors";
import type { ActionState } from "@/app/login/actions";

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser({ allowPasswordChangePending: true });
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) return { error: "비밀번호가 서로 다릅니다." };
  try {
    await changePassword(user.id, password);
    // 모든 세션이 지워졌으므로 현재 브라우저용 새 세션을 발급한다.
    const { token, expiresAt } = await createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  redirect("/books");
}
