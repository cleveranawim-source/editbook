import { expect, test } from "vitest";
import { computePartStatus } from "@/lib/part-status";

const base = { hasVersion: true, openRequests: 0, awaitingReview: 0, completed: false };

test("원고가 없으면 NO_MANUSCRIPT", () => {
  expect(computePartStatus({ ...base, hasVersion: false })).toEqual({
    kind: "NO_MANUSCRIPT",
    count: 0,
    label: "원고 없음",
    tone: "gray",
  });
});

test("완료되었으면 DONE", () => {
  expect(computePartStatus({ ...base, completed: true })).toEqual({
    kind: "DONE",
    count: 0,
    label: "완료",
    tone: "green",
  });
});

test("열린 요청이 있으면 REQUESTS", () => {
  expect(computePartStatus({ ...base, openRequests: 2 })).toEqual({
    kind: "REQUESTS",
    count: 2,
    label: "요청 2",
    tone: "red",
  });
});

test("확인 대기가 있으면 AWAITING", () => {
  expect(computePartStatus({ ...base, awaitingReview: 3 })).toEqual({
    kind: "AWAITING",
    count: 3,
    label: "확인 대기 3",
    tone: "yellow",
  });
});

test("그 외에는 EDITOR_REVIEW", () => {
  expect(computePartStatus(base)).toEqual({
    kind: "EDITOR_REVIEW",
    count: 0,
    label: "편집장 검토 중",
    tone: "yellow",
  });
});

test("요청과 확인 대기가 둘 다 있으면 REQUESTS 우선", () => {
  expect(computePartStatus({ ...base, openRequests: 1, awaitingReview: 4 })).toEqual({
    kind: "REQUESTS",
    count: 1,
    label: "요청 1",
    tone: "red",
  });
});

import { viewerTone, viewerTurn } from "@/lib/part-status";

test("viewerTurn: 교사는 요청이 남았을 때, 편집장은 확인·검토할 때 내 차례", () => {
  expect(viewerTurn("REQUESTS", "author")).toBe("mine");
  expect(viewerTurn("REQUESTS", "editor")).toBe("theirs");
  expect(viewerTurn("AWAITING", "editor")).toBe("mine");
  expect(viewerTurn("EDITOR_REVIEW", "editor")).toBe("mine");
  expect(viewerTurn("EDITOR_REVIEW", "author")).toBe("theirs");
  expect(viewerTurn("REQUESTS", "other")).toBe("none");
  expect(viewerTurn("NO_MANUSCRIPT", "author")).toBe("none");
  expect(viewerTurn("DONE", "other")).toBe("done");
});

test("viewerTone follows the turn", () => {
  const s = computePartStatus({ ...base, openRequests: 1 });
  expect(viewerTone(s, "mine")).toBe("red");
  expect(viewerTone(s, "theirs")).toBe("yellow");
  expect(viewerTone(s, "none")).toBe("yellow");
  expect(viewerTone(computePartStatus({ ...base, hasVersion: false }), "none")).toBe("gray");
  expect(viewerTone(computePartStatus({ ...base, completed: true }), "done")).toBe("green");
});
