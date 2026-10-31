/**
 * 로그인 시도 제한(메모리 기반).
 *
 * 키(아이디·IP)마다 최근 실패 시각을 기억하고, 시간창 안의 실패가 한도에 닿으면
 * 잠금 시간 동안 시도를 거부한다. 서버 프로세스가 하나인 운영(VPS·단일 컨테이너)을
 * 가정한다. 여러 인스턴스로 늘리면 DB 테이블로 옮겨야 한다(미룬 항목 참고).
 */
export type ThrottleOptions = {
  maxFailures: number;
  windowMs: number;
  lockMs: number;
};

export type ThrottleCheck = { locked: false } | { locked: true; retryAfterMs: number };

type Entry = { failures: number[]; lockedUntil: number };

export class LoginThrottle {
  private entries = new Map<string, Entry>();

  constructor(
    private readonly opts: ThrottleOptions,
    private readonly now: () => number = () => Date.now(),
  ) {}

  check(key: string): ThrottleCheck {
    const e = this.entries.get(key);
    if (!e) return { locked: false };
    const t = this.now();
    if (e.lockedUntil > t) return { locked: true, retryAfterMs: e.lockedUntil - t };
    return { locked: false };
  }

  /** 실패를 기록하고, 한도에 닿았으면 잠금을 건다. */
  fail(key: string): ThrottleCheck {
    const t = this.now();
    const e = this.entries.get(key) ?? { failures: [], lockedUntil: 0 };
    e.failures = e.failures.filter((f) => t - f < this.opts.windowMs);
    e.failures.push(t);
    if (e.failures.length >= this.opts.maxFailures) {
      e.lockedUntil = t + this.opts.lockMs;
      e.failures = [];
    }
    this.entries.set(key, e);
    this.prune(t);
    return this.check(key);
  }

  /** 성공하면 그 키의 기록을 지운다. */
  succeed(key: string): void {
    this.entries.delete(key);
  }

  reset(): void {
    this.entries.clear();
  }

  private prune(t: number): void {
    if (this.entries.size < 5000) return;
    for (const [k, e] of this.entries) {
      if (e.lockedUntil <= t && e.failures.every((f) => t - f >= this.opts.windowMs)) {
        this.entries.delete(k);
      }
    }
  }
}

const FIFTEEN_MIN = 15 * 60 * 1000;

/** 아이디 기준: 15분 안에 10번 실패하면 15분 잠금. */
export const LOGIN_ID_LIMIT: ThrottleOptions = { maxFailures: 10, windowMs: FIFTEEN_MIN, lockMs: FIFTEEN_MIN };
/** IP 기준: 15분 안에 50번 실패하면 15분 잠금(한 학교에서 여러 사람이 같은 IP를 쓸 수 있어 느슨하게). */
export const IP_LIMIT: ThrottleOptions = { maxFailures: 50, windowMs: FIFTEEN_MIN, lockMs: FIFTEEN_MIN };

const g = globalThis as unknown as { __ebLoginIdThrottle?: LoginThrottle; __ebIpThrottle?: LoginThrottle };
export const loginIdThrottle = (g.__ebLoginIdThrottle ??= new LoginThrottle(LOGIN_ID_LIMIT));
export const ipThrottle = (g.__ebIpThrottle ??= new LoginThrottle(IP_LIMIT));

export function retryMessage(retryAfterMs: number): string {
  const min = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return `로그인 시도가 너무 많습니다. ${min}분 뒤에 다시 시도하세요.`;
}
