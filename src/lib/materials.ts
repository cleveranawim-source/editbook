import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions";
import { perspectiveOf } from "@/lib/requests";
import { getPartForViewer } from "@/lib/versions";
import type { Material } from "@/generated/prisma/client";

import { MAX_MATERIAL_BYTES } from "@/lib/files";

export { MAX_MATERIAL_BYTES };

/** 자료를 올릴 수 있는가: 편집장(관리자 포함)과 이 파트 담당 교사, 책이 진행 중일 때. */
export async function assertCanAddMaterial(partId: string, actor: Actor) {
  const view = await getPartForViewer(partId, actor);
  if (!view) throw new AppError("파트를 찾을 수 없습니다.");
  if (view.book.status !== "ACTIVE") throw new AppError("보관된 책은 바꿀 수 없습니다.");
  if (perspectiveOf(actor, view) === "other") throw new AppError("편집장과 이 파트 담당 선생님만 자료를 올릴 수 있습니다.");
  return view;
}

function cleanTitle(title: string): string {
  const t = title.trim();
  if (!t) throw new AppError("이름을 적어 주세요.");
  return t.slice(0, 200);
}

export async function createFileMaterial(
  actor: Actor,
  input: { partId: string; ref: string; name: string; size: number; contentType?: string; thumbRef?: string | null; note?: string },
): Promise<Material> {
  await assertCanAddMaterial(input.partId, actor);
  if (!Number.isFinite(input.size) || input.size <= 0) throw new AppError("빈 파일은 올릴 수 없습니다.");
  if (input.size > MAX_MATERIAL_BYTES) throw new AppError("파일이 너무 큽니다(최대 2GB).");
  return prisma.material.create({
    data: {
      partId: input.partId,
      kind: "FILE",
      title: cleanTitle(input.name),
      ref: input.ref,
      thumbRef: input.thumbRef ?? null,
      size: BigInt(Math.round(input.size)),
      contentType: (input.contentType ?? "").slice(0, 120) || null,
      note: (input.note ?? "").trim().slice(0, 300),
      uploadedById: actor.id,
    },
  });
}

export async function createLinkMaterial(
  actor: Actor,
  input: { partId: string; url: string; title: string; note?: string },
): Promise<Material> {
  await assertCanAddMaterial(input.partId, actor);
  let url: URL;
  try {
    url = new URL(input.url.trim());
  } catch {
    throw new AppError("주소가 올바르지 않습니다. https://로 시작하는 주소를 넣어 주세요.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new AppError("http 또는 https 주소만 넣을 수 있습니다.");
  return prisma.material.create({
    data: {
      partId: input.partId,
      kind: "LINK",
      title: cleanTitle(input.title || url.hostname),
      url: url.toString(),
      note: (input.note ?? "").trim().slice(0, 300),
      uploadedById: actor.id,
    },
  });
}

export type MaterialRow = Material & { uploadedBy: { name: string } | null };

export async function listMaterials(partId: string): Promise<MaterialRow[]> {
  return prisma.material.findMany({
    where: { partId },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });
}

/** 올린 사람이나 편집장(관리자 포함)이 지운다. 지운 파일의 저장 위치 표시자를 돌려준다. */
export async function deleteMaterial(actor: Actor, id: string): Promise<{ partId: string; refs: string[] }> {
  const m = await prisma.material.findUnique({ where: { id } });
  if (!m) throw new AppError("자료를 찾을 수 없습니다.");
  const view = await getPartForViewer(m.partId, actor);
  if (!view) throw new AppError("자료를 찾을 수 없습니다.");
  if (view.book.status !== "ACTIVE") throw new AppError("보관된 책은 바꿀 수 없습니다.");
  if (perspectiveOf(actor, view) !== "editor" && m.uploadedById !== actor.id) {
    throw new AppError("올린 사람이나 편집장만 지울 수 있습니다.");
  }
  await prisma.material.delete({ where: { id } });
  return { partId: m.partId, refs: [m.ref, m.thumbRef].filter((r): r is string => Boolean(r)) };
}

export function isImageMaterial(m: Pick<Material, "kind" | "contentType" | "title">): boolean {
  if (m.kind !== "FILE") return false;
  if (m.contentType?.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(m.title);
}

export async function materialCount(partId: string): Promise<number> {
  return prisma.material.count({ where: { partId } });
}
