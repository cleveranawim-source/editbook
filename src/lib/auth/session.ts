import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import type { User } from "@/generated/prisma/client";

export const SESSION_COOKIE = "eb_session";
export const SESSION_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  return { token, expiresAt };
}

export async function getUserBySessionToken(token: string): Promise<User | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session.user;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}
