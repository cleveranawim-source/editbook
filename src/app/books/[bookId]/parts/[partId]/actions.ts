"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current";
import { AppError } from "@/lib/errors";
import { assertCanUpload, createVersion } from "@/lib/versions";

export type CreateVersionInput = {
  partId: string;
  originalRef: string;
  originalName: string;
  originalSize: number;
  pdfRef: string | null;
  pdfName: string | null;
  note: string;
};

export type CreateVersionResult = { ok: true; number: number } | { ok: false; error: string };

/** 파일이 저장소에 올라간 뒤 버전 한 줄을 남긴다. 권한은 여기서 다시 확인한다. */
export async function createVersionAction(input: CreateVersionInput): Promise<CreateVersionResult> {
  const user = await requireUser();
  try {
    const view = await assertCanUpload(input.partId, user);
    const v = await createVersion({ ...input, uploadedById: user.id });
    revalidatePath(`/books/${view.book.id}`);
    revalidatePath(`/books/${view.book.id}/parts/${input.partId}`);
    return { ok: true, number: v.number };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    throw e;
  }
}
