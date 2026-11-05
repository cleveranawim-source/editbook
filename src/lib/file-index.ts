import { prisma } from "@/lib/db";

/**
 * 저장 위치 표시자(ref)로 "이 파일이 어느 파트의 무엇인지"를 찾는다.
 * 내려받기·로컬 파일 서빙에서 권한 확인(책 참여자인가)과 원래 이름 붙이기에 쓴다.
 */
export type FileOwner = { partId: string; filename: string };

export async function findFileOwner(ref: string): Promise<FileOwner | null> {
  const v = await prisma.version.findFirst({ where: { OR: [{ originalRef: ref }, { pdfRef: ref }] } });
  if (v) {
    const filename = ref === v.originalRef ? v.originalName : (v.pdfName ?? "미리보기.pdf");
    return { partId: v.partId, filename };
  }
  const m = await prisma.material.findFirst({ where: { OR: [{ ref }, { thumbRef: ref }] } });
  if (m) return { partId: m.partId, filename: ref === m.ref ? m.title : `미리보기-${m.title}.jpg` };
  const c = await prisma.editRequestComment.findFirst({
    where: { attachmentRef: ref },
    include: { request: { select: { partId: true } } },
  });
  if (c) return { partId: c.request.partId, filename: c.attachmentName ?? "첨부" };
  return null;
}
