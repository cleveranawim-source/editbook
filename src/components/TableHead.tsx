import type { ReactNode } from "react";
import { cx } from "@/components/cx";

/**
 * 표 머리 띠(넓은 화면에서만). 각 행은 스스로 설명하도록(좁은 화면용 글자표·sr-only)
 * 짜여 있으므로 머리 띠는 보조 기술에서 숨긴다. 열 너비는 행과 같은 grid 클래스를 넘긴다.
 */
export function TableHead({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cx(
        "hidden h-10 items-center border-b border-rb-line bg-rb-tint text-[13px] font-bold text-ink-2 lg:grid",
        className,
      )}
    >
      {children}
    </div>
  );
}
