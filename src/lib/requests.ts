import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions";
import { canRemark, clampRect, type Perspective, type Rect, type RequestView } from "@/lib/request-view";
import { fileUrl } from "@/lib/storage";
import { MAX_ATTACHMENT_BYTES } from "@/lib/files";
import { getPartForViewer, type PartView } from "@/lib/versions";
import { editorIds, notify, partUrl } from "@/lib/notify";
import type { EditCommentAction, EditRequest, Prisma } from "@/generated/prisma/client";

const MAX_BODY = 2000;

async function nameOf(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return u?.name ?? "누군가";
}

/** 요청 하나에 얽힌 사람들: 요청 작성자, 담당 교사, 댓글 단 사람. */
async function participantsOf(requestId: string): Promise<string[]> {
  const r = await prisma.editRequest.findUnique({
    where: { id: requestId },
    include: { part: { select: { assigneeUserId: true } }, comments: { select: { authorId: true } } },
  });
  if (!r) return [];
  return [r.authorId, r.part.assigneeUserId, ...r.comments.map((c) => c.authorId)].filter((x): x is string => Boolean(x));
}

/** 이 사람이 이 파트에서 어떤 자리인가. 관리자는 편집장과 같게 본다. */
export function perspectiveOf(
  actor: Actor,
  view: { role: PartView["role"]; part: { assigneeUserId: string | null } },
): Perspective {
  if (actor.isAdmin || view.role === "EDITOR") return "editor";
  if (view.role !== null && view.part.assigneeUserId === actor.id) return "author";
  return "other";
}

async function loadWritable(partId: string, actor: Actor): Promise<{ view: PartView; perspective: Perspective }> {
  const view = await getPartForViewer(partId, actor);
  if (!view) throw new AppError("파트를 찾을 수 없습니다.");
  if (view.book.status !== "ACTIVE") throw new AppError("보관된 책은 바꿀 수 없습니다.");
  return { view, perspective: perspectiveOf(actor, view) };
}

function cleanBody(body: string, required: boolean): string {
  const b = body.trim();
  if (required && !b) throw new AppError("내용을 적어 주세요.");
  if (b.length > MAX_BODY) throw new AppError(`내용이 너무 깁니다(최대 ${MAX_BODY}자).`);
  return b;
}

/** 영역을 그려 요청(편집장)이나 질문(담당 교사)을 남긴다. 미리보기 PDF가 있는 버전에만. */
export async function createRequest(
  actor: Actor,
  input: Rect & { partId: string; versionId: string; body: string },
): Promise<EditRequest> {
  const { view, perspective } = await loadWritable(input.partId, actor);
  if (perspective === "other") throw new AppError("편집장과 이 파트 담당 선생님만 표시할 수 있습니다.");
  const version = await prisma.version.findUnique({ where: { id: input.versionId } });
  if (!version || version.partId !== input.partId) throw new AppError("버전을 찾을 수 없습니다.");
  if (!version.pdfRef) throw new AppError("미리보기 PDF가 있는 버전에만 표시할 수 있습니다.");
  const body = cleanBody(input.body, true);
  const rect = clampRect(input);
  if (rect.w < 0.005 || rect.h < 0.005) throw new AppError("영역이 너무 작습니다. 조금 더 크게 그려 주세요.");
  const kind = perspective === "editor" ? "REQUEST" : "QUESTION";
  const created = await prisma.$transaction(async (tx) => {
    const max = await tx.editRequest.aggregate({ where: { partId: input.partId }, _max: { number: true } });
    return tx.editRequest.create({
      data: {
        partId: input.partId,
        versionId: version.id,
        number: (max._max.number ?? 0) + 1,
        kind,
        status: "OPEN",
        ...rect,
        body,
        authorId: actor.id,
      },
    });
  });
  const part = view.part;
  const url = partUrl(part.bookId, part.id, { version: version.number, request: created.id });
  const who = await nameOf(actor.id);
  if (kind === "REQUEST") {
    await notify([part.assigneeUserId], { kind: "request", title: `「${part.title}」 ${created.number}번 수정 요청 · ${who}`, body, url }, actor.id);
  } else {
    await notify(await editorIds(part.bookId), { kind: "question", title: `「${part.title}」 ${created.number}번 질문 · ${who}`, body, url }, actor.id);
  }
  return created;
}

async function loadRequest(requestId: string, actor: Actor) {
  const req = await prisma.editRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new AppError("요청을 찾을 수 없습니다.");
  const { view, perspective } = await loadWritable(req.partId, actor);
  const version = await prisma.version.findUnique({ where: { id: req.versionId }, select: { number: true } });
  const url = partUrl(view.part.bookId, view.part.id, { version: version?.number, request: req.id });
  return { req, perspective, view, url };
}

/**
 * 댓글. 상태가 저절로 바뀌는 두 경우:
 * - 담당 교사가 열린 요청에 답하면 → 응답함
 * - 편집장이 열린 질문에 답하면 → 답변됨
 */
export type Attachment = { ref: string; name: string; size: number };

export async function addComment(actor: Actor, requestId: string, rawBody: string, attachment?: Attachment | null): Promise<void> {
  const { req, perspective, view, url } = await loadRequest(requestId, actor);
  if (perspective === "other") throw new AppError("편집장과 이 파트 담당 선생님만 댓글을 달 수 있습니다.");
  if (attachment && (!attachment.ref || attachment.size <= 0 || attachment.size > MAX_ATTACHMENT_BYTES)) {
    throw new AppError("첨부 파일은 100MB까지 올릴 수 있습니다.");
  }
  const body = cleanBody(rawBody, !attachment);
  let action: EditCommentAction = "NOTE";
  let status = req.status;
  if (req.kind === "REQUEST" && req.status === "OPEN" && perspective === "author") {
    action = "RESPOND";
    status = "RESPONDED";
  } else if (req.kind === "QUESTION" && req.status === "OPEN" && perspective === "editor") {
    action = "ANSWER";
    status = "ANSWERED";
  }
  await prisma.$transaction([
    prisma.editRequestComment.create({
      data: {
        requestId,
        authorId: actor.id,
        body,
        action,
        attachmentRef: attachment?.ref ?? null,
        attachmentName: attachment ? attachment.name.trim().slice(0, 200) || "첨부" : null,
        attachmentSize: attachment ? Math.round(attachment.size) : null,
      },
    }),
    prisma.editRequest.update({ where: { id: requestId }, data: { status } }),
  ]);
  const who = await nameOf(actor.id);
  const t = view.part.title;
  const people = await participantsOf(requestId);
  if (action === "RESPOND") {
    await notify([...(await editorIds(view.part.bookId)), ...people], { kind: "respond", title: `「${t}」 ${req.number}번 요청에 응답 · ${who}`, body, url }, actor.id);
  } else if (action === "ANSWER") {
    await notify(people, { kind: "answer", title: `「${t}」 ${req.number}번 질문에 답변 · ${who}`, body, url }, actor.id);
  } else {
    await notify(people, { kind: "comment", title: `「${t}」 ${req.number}번에 댓글 · ${who}`, body, url }, actor.id);
  }
}

/** 편집장이 확인 완료. 메모는 선택. */
export async function resolveRequest(actor: Actor, requestId: string, rawBody = ""): Promise<void> {
  const { req, perspective, view, url } = await loadRequest(requestId, actor);
  if (perspective !== "editor") throw new AppError("편집장만 확인 완료할 수 있습니다.");
  if (req.kind !== "REQUEST" || req.status === "RESOLVED") throw new AppError("확인 완료할 수 없는 상태입니다.");
  const body = cleanBody(rawBody, false);
  await prisma.$transaction([
    prisma.editRequestComment.create({ data: { requestId, authorId: actor.id, body, action: "RESOLVE" } }),
    prisma.editRequest.update({ where: { id: requestId }, data: { status: "RESOLVED" } }),
  ]);
  await notify(
    [view.part.assigneeUserId],
    { kind: "resolve", title: `「${view.part.title}」 ${req.number}번 요청 확인 완료 · ${await nameOf(actor.id)}`, body, url },
    actor.id,
  );
}

/** 편집장이 재요청. 무엇이 더 필요한지 메모가 꼭 있어야 한다. */
export async function rerequest(actor: Actor, requestId: string, rawBody: string): Promise<void> {
  const { req, perspective, view, url } = await loadRequest(requestId, actor);
  if (perspective !== "editor") throw new AppError("편집장만 재요청할 수 있습니다.");
  if (req.kind !== "REQUEST" || req.status === "OPEN") throw new AppError("재요청할 수 없는 상태입니다.");
  const body = cleanBody(rawBody, true);
  await prisma.$transaction([
    prisma.editRequestComment.create({ data: { requestId, authorId: actor.id, body, action: "REREQUEST" } }),
    prisma.editRequest.update({ where: { id: requestId }, data: { status: "OPEN" } }),
  ]);
  await notify(
    [view.part.assigneeUserId],
    { kind: "rerequest", title: `「${view.part.title}」 ${req.number}번 재요청 · ${await nameOf(actor.id)}`, body, url },
    actor.id,
  );
}

/** 새 버전을 올리면서 고른 열린 요청들을 한꺼번에 응답함으로. 다른 파트·닫힌 것·질문은 건너뛴다. */
export async function respondWithVersion(
  actor: Actor,
  partId: string,
  versionId: string,
  requestIds: string[],
): Promise<number> {
  if (requestIds.length === 0) return 0;
  const { perspective } = await loadWritable(partId, actor);
  if (perspective === "other") throw new AppError("이 파트의 담당 선생님이나 편집장만 응답할 수 있습니다.");
  const version = await prisma.version.findUnique({ where: { id: versionId } });
  const targets = await prisma.editRequest.findMany({
    where: { id: { in: requestIds }, partId, kind: "REQUEST", status: "OPEN" },
  });
  if (targets.length === 0) return 0;
  const note = version ? `v${version.number}에 반영했습니다.` : "새 버전에 반영했습니다.";
  await prisma.$transaction([
    ...targets.map((t) =>
      prisma.editRequestComment.create({
        data: { requestId: t.id, authorId: actor.id, body: note, action: "RESPOND", versionId },
      }),
    ),
    prisma.editRequest.updateMany({ where: { id: { in: targets.map((t) => t.id) } }, data: { status: "RESPONDED" } }),
  ]);
  return targets.length;
}

/** 편집장이 최신 버전을 "이 파트 완료"로 표시하거나 푼다. */
export async function setPartComplete(actor: Actor, partId: string, complete: boolean): Promise<void> {
  const { perspective } = await loadWritable(partId, actor);
  if (perspective !== "editor") throw new AppError("편집장만 완료를 표시할 수 있습니다.");
  let versionId: string | null = null;
  if (complete) {
    const latest = await prisma.version.findFirst({ where: { partId }, orderBy: { number: "desc" } });
    if (!latest) throw new AppError("원고가 없는 파트는 완료할 수 없습니다.");
    versionId = latest.id;
  }
  await prisma.part.update({ where: { id: partId }, data: { completedVersionId: versionId } });
}

const requestInclude = {
  author: true,
  version: { select: { number: true } },
  comments: {
    orderBy: { createdAt: "asc" },
    include: { author: true, version: { select: { number: true } } },
  },
} satisfies Prisma.EditRequestInclude;

/** 화면용: 이 파트의 요청 전부(번호순). */
export async function listRequestViews(partId: string): Promise<RequestView[]> {
  const rows = await prisma.editRequest.findMany({
    where: { partId },
    orderBy: { number: "asc" },
    include: requestInclude,
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    kind: r.kind,
    status: r.status,
    page: r.page,
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
    body: r.body,
    authorName: r.author?.name ?? "알 수 없음",
    createdAt: r.createdAt.toISOString(),
    versionId: r.versionId,
    versionNumber: r.version.number,
    comments: r.comments.map((c) => ({
      id: c.id,
      authorName: c.author?.name ?? "알 수 없음",
      body: c.body,
      action: c.action,
      versionNumber: c.version?.number ?? null,
      createdAt: c.createdAt.toISOString(),
      attachment: c.attachmentRef
        ? { name: c.attachmentName ?? "첨부", size: c.attachmentSize, url: fileUrl(c.attachmentRef, { download: true }) }
        : null,
    })),
  }));
}

export type PartCounts = { openRequests: number; awaitingReview: number };

/** 파트별 상태 계산 재료: 열린 요청(교사 차례), 확인 대기(응답함 요청 + 답 안 된 질문 = 편집장 차례). */
export async function requestCountsByPart(partIds: string[]): Promise<Map<string, PartCounts>> {
  const out = new Map<string, PartCounts>(partIds.map((id) => [id, { openRequests: 0, awaitingReview: 0 }]));
  if (partIds.length === 0) return out;
  const groups = await prisma.editRequest.groupBy({
    by: ["partId", "kind", "status"],
    where: { partId: { in: partIds }, status: { in: ["OPEN", "RESPONDED"] } },
    _count: { _all: true },
  });
  for (const g of groups) {
    const c = out.get(g.partId);
    if (!c) continue;
    if (g.kind === "REQUEST" && g.status === "OPEN") c.openRequests += g._count._all;
    else c.awaitingReview += g._count._all;
  }
  return out;
}

/** "내 책" 카드용: 책마다 보는 사람 기준 내 차례·상대 차례 파트 수. */
export async function turnSummaryForBooks(
  actor: Actor,
  roles: Map<string, PartView["role"]>,
): Promise<Map<string, { mine: number; theirs: number }>> {
  const { computePartStatus, viewerTurn } = await import("@/lib/part-status");
  const bookIds = Array.from(roles.keys());
  const out = new Map(bookIds.map((id) => [id, { mine: 0, theirs: 0 }]));
  if (bookIds.length === 0) return out;
  const parts = await prisma.part.findMany({
    where: { bookId: { in: bookIds } },
    include: { versions: { orderBy: { number: "desc" }, take: 1, select: { id: true } } },
  });
  const counts = await requestCountsByPart(parts.map((p) => p.id));
  for (const part of parts) {
    const latest = part.versions[0];
    const status = computePartStatus({
      hasVersion: Boolean(latest),
      ...(counts.get(part.id) ?? { openRequests: 0, awaitingReview: 0 }),
      completed: Boolean(latest && part.completedVersionId === latest.id),
    });
    const turn = viewerTurn(status.kind, perspectiveOf(actor, { role: roles.get(part.bookId) ?? null, part }));
    const s = out.get(part.bookId)!;
    if (turn === "mine") s.mine += 1;
    else if (turn === "theirs") s.theirs += 1;
  }
  return out;
}

/** 새 버전이 올라오면 편집장들(과 담당 교사)에게. 응답한 요청 수를 함께 알린다. */
export async function notifyNewVersion(actor: Actor, versionId: string, respondedCount: number): Promise<void> {
  const v = await prisma.version.findUnique({ where: { id: versionId }, include: { part: true } });
  if (!v) return;
  const who = await nameOf(actor.id);
  const extra = respondedCount > 0 ? ` · 요청 ${respondedCount}개 응답` : "";
  await notify(
    [...(await editorIds(v.part.bookId)), v.part.assigneeUserId],
    {
      kind: "version",
      title: `「${v.part.title}」 v${v.number} 올라옴 · ${who}${extra}`,
      body: v.note,
      url: partUrl(v.part.bookId, v.partId, { version: v.number }),
    },
    actor.id,
  );
}

/** 예전 버전에 표시된 요청을 다른 버전 위에 다시 그린다(요청은 편집장, 질문은 담당 교사). */
export async function moveRequest(actor: Actor, requestId: string, input: Rect & { versionId: string }): Promise<void> {
  const { req, perspective } = await loadRequest(requestId, actor);
  if (!canRemark(req.kind, perspective)) throw new AppError("이 요청을 다시 표시할 수 없습니다.");
  const version = await prisma.version.findUnique({ where: { id: input.versionId } });
  if (!version || version.partId !== req.partId) throw new AppError("버전을 찾을 수 없습니다.");
  if (!version.pdfRef) throw new AppError("미리보기 PDF가 있는 버전에만 표시할 수 있습니다.");
  const rect = clampRect(input);
  if (rect.w < 0.005 || rect.h < 0.005) throw new AppError("영역이 너무 작습니다. 조금 더 크게 그려 주세요.");
  await prisma.$transaction([
    prisma.editRequest.update({ where: { id: requestId }, data: { versionId: version.id, ...rect } }),
    prisma.editRequestComment.create({
      data: { requestId, authorId: actor.id, body: `v${version.number}에 다시 표시했습니다.`, action: "NOTE", versionId: version.id },
    }),
  ]);
}
