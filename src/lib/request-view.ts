/**
 * 수정 요청을 화면에 그릴 때 쓰는 모양과 이름표. 서버·브라우저가 같이 쓰므로 Prisma를 들이지 않는다.
 */

export type RequestKind = "REQUEST" | "QUESTION";
export type RequestStatus = "OPEN" | "RESPONDED" | "RESOLVED" | "ANSWERED";
export type CommentAction = "NOTE" | "RESPOND" | "RESOLVE" | "REREQUEST" | "ANSWER";
export type Tone = "red" | "yellow" | "green" | "gray";

export type Rect = { page: number; x: number; y: number; w: number; h: number };

export type CommentView = {
  id: string;
  authorName: string;
  body: string;
  action: CommentAction;
  versionNumber: number | null;
  createdAt: string;
};

export type RequestView = Rect & {
  id: string;
  number: number;
  kind: RequestKind;
  status: RequestStatus;
  body: string;
  authorName: string;
  createdAt: string;
  versionId: string;
  versionNumber: number;
  comments: CommentView[];
};

/** 이 화면을 보는 사람의 자리: 편집장(관리자 포함) / 이 파트 담당 교사 / 그 밖의 참여자. */
export type Perspective = "editor" | "author" | "other";

export function isClosed(status: RequestStatus): boolean {
  return status === "RESOLVED" || status === "ANSWERED";
}

export function statusLabel(kind: RequestKind, status: RequestStatus): string {
  if (kind === "QUESTION") return status === "OPEN" ? "질문" : "답변됨";
  return { OPEN: "요청됨", RESPONDED: "응답함", RESOLVED: "확인 완료", ANSWERED: "확인 완료" }[status];
}

/** 지금 누가 움직여야 하는가. 교사 차례면 "author", 편집장 차례면 "editor", 끝났으면 null. */
export function whoseTurn(kind: RequestKind, status: RequestStatus): "author" | "editor" | null {
  if (isClosed(status)) return null;
  if (kind === "QUESTION") return "editor";
  return status === "OPEN" ? "author" : "editor";
}

/** 보는 사람 기준 색: 내 차례 빨강, 상대 차례 노랑, 끝 초록. */
export function toneFor(kind: RequestKind, status: RequestStatus, perspective: Perspective): Tone {
  const turn = whoseTurn(kind, status);
  if (turn === null) return "green";
  return turn === perspective ? "red" : "yellow";
}

export function clampRect(r: Rect): Rect {
  const c = (n: number) => Math.min(1, Math.max(0, n));
  const x = c(r.x);
  const y = c(r.y);
  return { page: Math.max(1, Math.floor(r.page)), x, y, w: Math.min(c(r.w), 1 - x), h: Math.min(c(r.h), 1 - y) };
}

export const COMMENT_ACTION_LABEL: Record<CommentAction, string> = {
  NOTE: "",
  RESPOND: "응답함",
  RESOLVE: "확인 완료",
  REREQUEST: "재요청",
  ANSWER: "답변",
};
