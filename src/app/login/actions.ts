"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, createSession, deleteSession } from "@/lib/auth/session";
import { authenticate } from "@/lib/users";
import { AppError } from "@/lib/errors";

export type ActionState = { error?: string };

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const loginId = String(formData.get("loginId") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    const user = await authenticate(loginId, password);
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

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
