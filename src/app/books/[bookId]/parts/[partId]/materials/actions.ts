"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current";
import { AppError } from "@/lib/errors";
import { createFileMaterial, createLinkMaterial, deleteMaterial } from "@/lib/materials";
import { deleteStoredFiles } from "@/lib/storage";
import { prisma } from "@/lib/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function run(partId: string, fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    throw e;
  }
  const part = await prisma.part.findUnique({ where: { id: partId }, select: { bookId: true } });
  if (part) {
    revalidatePath(`/books/${part.bookId}/parts/${partId}/materials`);
    revalidatePath(`/books/${part.bookId}/parts/${partId}`);
  }
  return { ok: true };
}

export async function addFileMaterialAction(input: {
  partId: string;
  ref: string;
  thumbRef: string | null;
  name: string;
  size: number;
  contentType: string;
  note: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  return run(input.partId, () => createFileMaterial(user, input));
}

export async function addLinkMaterialAction(input: { partId: string; url: string; title: string; note: string }): Promise<ActionResult> {
  const user = await requireUser();
  return run(input.partId, () => createLinkMaterial(user, input));
}

export async function deleteMaterialAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const m = await prisma.material.findUnique({ where: { id }, select: { partId: true } });
  if (!m) return { ok: false, error: "자료를 찾을 수 없습니다." };
  return run(m.partId, async () => {
    const { refs } = await deleteMaterial(user, id);
    await deleteStoredFiles(refs);
  });
}
