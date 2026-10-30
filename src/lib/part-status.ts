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
