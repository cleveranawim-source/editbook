import { expect, test } from "vitest";
import { LoginThrottle, retryMessage } from "@/lib/auth/throttle";

function make(start = 1_000_000) {
  let now = start;
  const t = new LoginThrottle({ maxFailures: 3, windowMs: 1000, lockMs: 5000 }, () => now);
  return { t, tick: (ms: number) => (now += ms) };
}

test("locks after maxFailures within the window and reports retry time", () => {
  const { t } = make();
  expect(t.check("a").locked).toBe(false);
  expect(t.fail("a").locked).toBe(false);
  expect(t.fail("a").locked).toBe(false);
  const r = t.fail("a");
  expect(r).toEqual({ locked: true, retryAfterMs: 5000 });
  expect(t.check("a")).toEqual({ locked: true, retryAfterMs: 5000 });
});

test("failures outside the window are forgotten", () => {
  const { t, tick } = make();
  t.fail("a");
  t.fail("a");
  tick(1001);
  expect(t.fail("a").locked).toBe(false);
});

test("lock expires and success clears the record", () => {
  const { t, tick } = make();
  t.fail("a"); t.fail("a"); t.fail("a");
  tick(4999);
  expect(t.check("a").locked).toBe(true);
  tick(1);
  expect(t.check("a").locked).toBe(false);
  t.fail("a"); t.fail("a");
  t.succeed("a");
  expect(t.fail("a").locked).toBe(false);
});

test("keys are independent", () => {
  const { t } = make();
  t.fail("a"); t.fail("a"); t.fail("a");
  expect(t.check("a").locked).toBe(true);
  expect(t.check("b").locked).toBe(false);
});

test("retryMessage rounds up to whole minutes, at least 1", () => {
  expect(retryMessage(1)).toBe("로그인 시도가 너무 많습니다. 1분 뒤에 다시 시도하세요.");
  expect(retryMessage(61_000)).toBe("로그인 시도가 너무 많습니다. 2분 뒤에 다시 시도하세요.");
  expect(retryMessage(15 * 60_000)).toBe("로그인 시도가 너무 많습니다. 15분 뒤에 다시 시도하세요.");
});
