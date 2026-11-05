import { prisma } from "@/lib/db";

/** 관리자 운영 상태: 자료 수와 저장소 사용량(DB 기록 기준), 마지막 백업 시각. */
export async function opsSummary() {
  const [users, books, parts, versions, requests, materials, notifications, pushDevices, versionBytes, materialBytes, lastBackup] =
    await Promise.all([
      prisma.user.count(),
      prisma.book.count(),
      prisma.part.count(),
      prisma.version.count(),
      prisma.editRequest.count(),
      prisma.material.count(),
      prisma.notification.count(),
      prisma.pushSubscription.count(),
      prisma.version.aggregate({ _sum: { originalSize: true } }),
      prisma.material.aggregate({ _sum: { size: true } }),
      prisma.appSetting.findUnique({ where: { key: "lastBackupAt" } }),
    ]);
  return {
    counts: { users, books, parts, versions, requests, materials, notifications, pushDevices },
    bytes: {
      originals: versionBytes._sum.originalSize ?? 0,
      materials: Number(materialBytes._sum.size ?? 0),
    },
    lastBackupAt: lastBackup ? new Date(lastBackup.value) : null,
    daysSinceBackup: lastBackup ? Math.floor((Date.now() - new Date(lastBackup.value).getTime()) / 86_400_000) : null,
  };
}

/**
 * 백업 한 벌: 모든 표(알림·푸시 구독 제외)와 파일 목록. 비밀번호는 해시만 들어 있다.
 * 파일 자체는 저장소(Vercel Blob)에 있고, 여기에는 주소와 원래 이름이 들어간다.
 */
export async function buildBackup() {
  const [users, books, members, parts, versions, requests, comments, materials] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.book.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.bookMember.findMany(),
    prisma.part.findMany({ orderBy: [{ bookId: "asc" }, { order: "asc" }] }),
    prisma.version.findMany({ orderBy: [{ partId: "asc" }, { number: "asc" }] }),
    prisma.editRequest.findMany({ orderBy: [{ partId: "asc" }, { number: "asc" }] }),
    prisma.editRequestComment.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.material.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const files = [
    ...versions.flatMap((v) => [
      { kind: "원고", ref: v.originalRef, name: v.originalName },
      ...(v.pdfRef && v.pdfRef !== v.originalRef ? [{ kind: "미리보기", ref: v.pdfRef, name: v.pdfName ?? "" }] : []),
    ]),
    ...materials.filter((m) => m.ref).map((m) => ({ kind: "자료", ref: m.ref!, name: m.title })),
    ...comments.filter((c) => c.attachmentRef).map((c) => ({ kind: "첨부", ref: c.attachmentRef!, name: c.attachmentName ?? "" })),
  ];
  const takenAt = new Date();
  await prisma.appSetting.upsert({
    where: { key: "lastBackupAt" },
    create: { key: "lastBackupAt", value: takenAt.toISOString() },
    update: { value: takenAt.toISOString() },
  });
  return {
    format: "editbook-backup-1",
    takenAt: takenAt.toISOString(),
    tables: { users, books, members, parts, versions, requests, comments, materials },
    files,
  };
}

/** JSON으로 바꿀 때 BigInt(자료 크기)를 숫자로. */
export function backupJson(data: unknown): string {
  return JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v), 2);
}
