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
