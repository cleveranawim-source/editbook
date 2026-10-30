import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SESSION_COOKIE, getUserBySessionToken } from "@/lib/auth/session";
import type { User } from "@/generated/prisma/client";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
});

export async function requireUser(opts?: {
  allowPasswordChangePending?: boolean;
}): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !opts?.allowPasswordChangePending) {
    redirect("/change-password");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isAdmin) notFound();
  return user;
}
