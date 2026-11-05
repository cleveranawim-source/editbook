import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertBookActive, getRole } from "@/lib/books";
import { canEditPart, canViewBook, type Actor } from "@/lib/permissions";
import { extensionOf, isOriginalName, MAX_FILE_BYTES } from "@/lib/files";
import type { Book, BookRole, Part, User, Version } from "@/generated/prisma/client";

export function assertOriginalName(name: string): void {
  if (!isOriginalName(name)) {
    throw new AppError("원고는 한글(hwp, hwpx)·워드(docx)·PDF 파일만 올릴 수 있습니다.");
  }
}

export function assertPdfName(name: string): void {
  if (extensionOf(name) !== "pdf") throw new AppError("미리보기 파일은 PDF여야 합니다.");
}

export function assertFileSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) throw new AppError("빈 파일은 올릴 수 없습니다.");
  if (size > MAX_FILE_BYTES) throw new AppError("파일이 너무 큽니다(최대 100MB).");
}

export type PartView = { part: Part & { assignee: User | null }; book: Book; role: BookRole | null };

/** 보는 사람 기준으로 파트를 찾는다. 책을 볼 수 없으면 null. */
export async function getPartForViewer(partId: string, actor: Actor): Promise<PartView | null> {
  const part = await prisma.part.findUnique({ where: { id: partId }, include: { assignee: true, book: true } });
  if (!part) return null;
  const role = await getRole(part.bookId, actor.id);
  if (!canViewBook(actor, role)) return null;
  const { book, ...rest } = part;
  return { part: rest, book, role };
}

/** 이 파트에 원고를 올릴 수 있는지(담당 교사·편집장, 책이 진행 중). 아니면 AppError. */
export async function assertCanUpload(partId: string, actor: Actor): Promise<PartView> {
  const view = await getPartForViewer(partId, actor);
  if (!view) throw new AppError("파트를 찾을 수 없습니다.");
  if (!canEditPart(actor, view.role, view.book.status, view.part)) {
    throw new AppError("이 파트의 담당 선생님이나 편집장만 원고를 올릴 수 있습니다.");
  }
  return view;
}

export async function createVersion(input: {
  partId: string;
  uploadedById: string;
  originalRef: string;
  originalName: string;
  originalSize: number;
  pdfRef?: string | null;
  pdfName?: string | null;
  note?: string;
}): Promise<Version> {
  const part = await prisma.part.findUnique({ where: { id: input.partId } });
  if (!part) throw new AppError("파트를 찾을 수 없습니다.");
  await assertBookActive(part.bookId);
  assertOriginalName(input.originalName);
  assertFileSize(input.originalSize);
  if (input.pdfRef && input.pdfName) assertPdfName(input.pdfName);
  // 원고 자체가 PDF면 그것이 곧 미리보기다.
  const pdfRef = input.pdfRef ?? (extensionOf(input.originalName) === "pdf" ? input.originalRef : null);
  const pdfName = pdfRef ? (input.pdfName ?? input.originalName) : null;
  return prisma.$transaction(async (tx) => {
    const max = await tx.version.aggregate({ where: { partId: input.partId }, _max: { number: true } });
    return tx.version.create({
      data: {
        partId: input.partId,
        number: (max._max.number ?? 0) + 1,
        originalRef: input.originalRef,
        originalName: input.originalName,
        originalSize: input.originalSize,
        pdfRef,
        pdfName,
        note: (input.note ?? "").trim(),
        uploadedById: input.uploadedById,
      },
    });
  });
}

export type VersionRow = Version & { uploadedBy: User | null };

/** 최신 번호가 먼저. */
export async function listVersions(partId: string): Promise<VersionRow[]> {
  return prisma.version.findMany({
    where: { partId },
    include: { uploadedBy: true },
    orderBy: { number: "desc" },
  });
}

/** 책의 파트별 최신 버전. 없는 파트는 키가 없다. */
export async function latestVersionsByPart(bookId: string): Promise<Map<string, Version>> {
  const rows = await prisma.version.findMany({
    where: { part: { bookId } },
    orderBy: [{ partId: "asc" }, { number: "desc" }],
    distinct: ["partId"],
  });
  return new Map(rows.map((v) => [v.partId, v]));
}

/** 저장 위치 표시자로 버전을 찾는다(로컬 파일 서빙의 권한 확인용). */
export async function findVersionByRef(ref: string): Promise<Version | null> {
  return prisma.version.findFirst({ where: { OR: [{ originalRef: ref }, { pdfRef: ref }] } });
}

/**
 * 버전 하나를 지운다(편집장·관리자). 요청이 달린 버전은 지울 수 없다.
 * 돌려주는 값은 지운 파일의 저장 위치 표시자들 — 저장소에서 파일을 지우는 일은 부르는 쪽이 한다.
 */
export async function deleteVersion(versionId: string, actor: Actor): Promise<{ partId: string; bookId: string; refs: string[] }> {
  const version = await prisma.version.findUnique({ where: { id: versionId }, include: { part: true } });
  if (!version) throw new AppError("버전을 찾을 수 없습니다.");
  const view = await getPartForViewer(version.partId, actor);
  if (!view) throw new AppError("버전을 찾을 수 없습니다.");
  if (view.book.status !== "ACTIVE") throw new AppError("보관된 책은 바꿀 수 없습니다.");
  if (!(actor.isAdmin || view.role === "EDITOR")) throw new AppError("편집장만 버전을 지울 수 있습니다.");
  const requestCount = await prisma.editRequest.count({ where: { versionId } });
  if (requestCount > 0) throw new AppError(`요청 ${requestCount}개가 달린 버전이라 지울 수 없습니다.`);
  await prisma.$transaction([
    prisma.version.delete({ where: { id: versionId } }),
    ...(version.part.completedVersionId === versionId
      ? [prisma.part.update({ where: { id: version.partId }, data: { completedVersionId: null } })]
      : []),
  ]);
  const refs = [version.originalRef, version.pdfRef].filter((r): r is string => Boolean(r));
  return { partId: version.partId, bookId: version.part.bookId, refs: Array.from(new Set(refs)) };
}
