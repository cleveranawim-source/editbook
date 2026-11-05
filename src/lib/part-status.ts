export type PartStatusInput = {
  hasVersion: boolean;
  openRequests: number;
  awaitingReview: number;
  completed: boolean;
};

export type PartStatus = {
  kind: "NO_MANUSCRIPT" | "EDITOR_REVIEW" | "REQUESTS" | "AWAITING" | "DONE";
  count: number;
  label: string;
  tone: "red" | "yellow" | "green" | "gray";
};

export function computePartStatus(i: PartStatusInput): PartStatus {
  if (!i.hasVersion) {
    return { kind: "NO_MANUSCRIPT", count: 0, label: "원고 없음", tone: "gray" };
  }
  if (i.completed) {
    return { kind: "DONE", count: 0, label: "완료", tone: "green" };
  }
  if (i.openRequests > 0) {
    return {
      kind: "REQUESTS",
      count: i.openRequests,
      label: `요청 ${i.openRequests}`,
      tone: "red",
    };
  }
  if (i.awaitingReview > 0) {
    return {
      kind: "AWAITING",
      count: i.awaitingReview,
      label: `확인 대기 ${i.awaitingReview}`,
      tone: "yellow",
    };
  }
  return { kind: "EDITOR_REVIEW", count: 0, label: "편집장 검토 중", tone: "yellow" };
}

/** 보는 사람 기준 차례. 교사(author)는 요청이 남았을 때, 편집장(editor)은 확인·검토할 것이 있을 때 "내 차례". */
export type ViewerTurn = "mine" | "theirs" | "done" | "none";

export function viewerTurn(kind: PartStatus["kind"], perspective: "editor" | "author" | "other"): ViewerTurn {
  if (kind === "DONE") return "done";
  if (kind === "NO_MANUSCRIPT" || perspective === "other") return "none";
  const editorsTurn = kind === "AWAITING" || kind === "EDITOR_REVIEW";
  return (perspective === "editor") === editorsTurn ? "mine" : "theirs";
}

/** 배지 색: 내 차례 빨강, 상대 차례 노랑, 완료 초록, 그 밖은 회색(원고 없음) 또는 기본 색. */
export function viewerTone(status: PartStatus, turn: ViewerTurn): PartStatus["tone"] {
  if (turn === "mine") return "red";
  if (turn === "theirs") return "yellow";
  if (turn === "done") return "green";
  return status.kind === "NO_MANUSCRIPT" ? "gray" : "yellow";
}
