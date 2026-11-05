import { prisma } from "@/lib/db";

/** 관리자 운영 상태: 자료 수와 저장소 사용량(DB 기록 기준), 마지막 백업 시각. */
export async function opsSummary() {
  // 질의를 하나씩 보낸다: 서버리스 데이터베이스의 동시 연결 수를 넘기지 않게.
  const users = await prisma.user.count();
  const books = await prisma.book.count();
  const parts = await prisma.part.count();
  const versions = await prisma.version.count();
  const requests = await prisma.editRequest.count();
  const materials = await prisma.material.count();
  const notifications = await prisma.notification.count();
  const pushDevices = await prisma.pushSubscription.count();
  const versionBytes = await prisma.version.aggregate({ _sum: { originalSize: true } });
  const materialBytes = await prisma.material.aggregate({ _sum: { size: true } });
  const lastBackup = await prisma.appSetting.findUnique({ where: { key: "lastBackupAt" } });
  return {
    counts: { users, books, parts, versions, requests, materials, notifications, pushDevices },
    bytes: {
      originals: Number(versionBytes._sum.originalSize ?? 0),
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
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const books = await prisma.book.findMany({ orderBy: { createdAt: "asc" } });
  const members = await prisma.bookMember.findMany();
  const parts = await prisma.part.findMany({ orderBy: [{ bookId: "asc" }, { order: "asc" }] });
  const versions = await prisma.version.findMany({ orderBy: [{ partId: "asc" }, { number: "asc" }] });
  const requests = await prisma.editRequest.findMany({ orderBy: [{ partId: "asc" }, { number: "asc" }] });
  const comments = await prisma.editRequestComment.findMany({ orderBy: { createdAt: "asc" } });
  const materials = await prisma.material.findMany({ orderBy: { createdAt: "asc" } });
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
