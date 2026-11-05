import { expect, test } from "vitest";
import { clampRect, isClosed, statusLabel, toneFor, whoseTurn } from "@/lib/request-view";

test("statusLabel", () => {
  expect(statusLabel("REQUEST", "OPEN")).toBe("요청됨");
  expect(statusLabel("REQUEST", "RESPONDED")).toBe("응답함");
  expect(statusLabel("REQUEST", "RESOLVED")).toBe("확인 완료");
  expect(statusLabel("QUESTION", "OPEN")).toBe("질문");
  expect(statusLabel("QUESTION", "ANSWERED")).toBe("답변됨");
});

test("whoseTurn and toneFor", () => {
  expect(whoseTurn("REQUEST", "OPEN")).toBe("author");
  expect(whoseTurn("REQUEST", "RESPONDED")).toBe("editor");
  expect(whoseTurn("QUESTION", "OPEN")).toBe("editor");
  expect(whoseTurn("REQUEST", "RESOLVED")).toBeNull();
  expect(isClosed("ANSWERED")).toBe(true);
  expect(toneFor("REQUEST", "OPEN", "author")).toBe("red");
  expect(toneFor("REQUEST", "OPEN", "editor")).toBe("yellow");
  expect(toneFor("REQUEST", "RESPONDED", "editor")).toBe("red");
  expect(toneFor("QUESTION", "OPEN", "other")).toBe("yellow");
  expect(toneFor("REQUEST", "RESOLVED", "author")).toBe("green");
});

test("clampRect keeps the box inside the page", () => {
  expect(clampRect({ page: 0.4, x: -0.2, y: 0.5, w: 2, h: 0.8 })).toEqual({ page: 1, x: 0, y: 0.5, w: 1, h: 0.5 });
});
