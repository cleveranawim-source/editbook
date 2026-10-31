"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, createSession, deleteSession } from "@/lib/auth/session";
import { authenticate } from "@/lib/users";
import { AppError } from "@/lib/errors";

export type ActionState = { error?: string };

/** 프록시(터널·리버스 프록시) 뒤에서 실제 접속 IP를 얻는다. 없으면 undefined. */
async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || undefined;
  return h.get("x-real-ip")?.trim() || undefined;
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const loginId = String(formData.get("loginId") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    const user = await authenticate(loginId, password, { ip: await clientIp() });
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
