"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current";
import { AppError } from "@/lib/errors";
import {
  addComment,
  createRequest,
  rerequest,
  resolveRequest,
  respondWithVersion,
  setPartComplete,
} from "@/lib/requests";
import { deleteStoredFiles } from "@/lib/storage";
import { assertCanUpload, createVersion, deleteVersion, getPartForViewer } from "@/lib/versions";
import type { Rect } from "@/lib/request-view";
import { prisma } from "@/lib/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    throw e;
  }
}

async function refreshPart(partId: string): Promise<void> {
  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part) return;
  revalidatePath(`/books/${part.bookId}`);
  revalidatePath(`/books/${part.bookId}/parts/${partId}`);
  revalidatePath("/books");
}

export type CreateVersionInput = {
  partId: string;
  originalRef: string;
  originalName: string;
  originalSize: number;
  pdfRef: string | null;
  pdfName: string | null;
  note: string;
  /** 이 버전으로 응답하는 열린 요청들 */
  respondsTo?: string[];
};

export type CreateVersionResult = { ok: true; number: number } | { ok: false; error: string };

/** 파일이 저장소에 올라간 뒤 버전 한 줄을 남긴다. 권한은 여기서 다시 확인한다. */
export async function createVersionAction(input: CreateVersionInput): Promise<CreateVersionResult> {
  const user = await requireUser();
  try {
    await assertCanUpload(input.partId, user);
    const { respondsTo = [], ...rest } = input;
    const v = await createVersion({ ...rest, uploadedById: user.id });
    await respondWithVersion(user, input.partId, v.id, respondsTo);
    await refreshPart(input.partId);
    return { ok: true, number: v.number };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function createRequestAction(
  input: Rect & { partId: string; versionId: string; body: string },
): Promise<ActionResult> {
  const user = await requireUser();
  return run(async () => {
    await createRequest(user, input);
    await refreshPart(input.partId);
  });
}

async function partOfRequest(requestId: string): Promise<string | null> {
  const r = await prisma.editRequest.findUnique({ where: { id: requestId }, select: { partId: true } });
  return r?.partId ?? null;
}

export async function commentAction(requestId: string, body: string): Promise<ActionResult> {
  const user = await requireUser();
  return run(async () => {
    await addComment(user, requestId, body);
    const partId = await partOfRequest(requestId);
    if (partId) await refreshPart(partId);
  });
}

export async function resolveAction(requestId: string, body: string): Promise<ActionResult> {
  const user = await requireUser();
  return run(async () => {
    await resolveRequest(user, requestId, body);
    const partId = await partOfRequest(requestId);
    if (partId) await refreshPart(partId);
  });
}

export async function rerequestAction(requestId: string, body: string): Promise<ActionResult> {
  const user = await requireUser();
  return run(async () => {
    await rerequest(user, requestId, body);
    const partId = await partOfRequest(requestId);
    if (partId) await refreshPart(partId);
  });
}

export async function completePartAction(partId: string, complete: boolean): Promise<ActionResult> {
  const user = await requireUser();
  return run(async () => {
    await setPartComplete(user, partId, complete);
    await refreshPart(partId);
  });
}

export async function deleteVersionAction(versionId: string): Promise<ActionResult> {
  const user = await requireUser();
  return run(async () => {
    const { partId, refs } = await deleteVersion(versionId, user);
    await deleteStoredFiles(refs);
    if (await getPartForViewer(partId, user)) await refreshPart(partId);
  });
}
