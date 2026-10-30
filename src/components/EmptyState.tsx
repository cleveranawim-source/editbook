import type { ReactNode } from "react";
import { cx } from "@/components/cx";

/**
 * 빈 자리: 한 문장, 있으면 할 일 하나.
 * - box: 원고지 위에 바로 놓이는 점선 칸(아직 채워지지 않은 종이).
 * - inline: 이미 카드 안일 때. 상자 속 상자를 만들지 않도록 테두리 없이 행 자리에 쓴다.
 */
export function EmptyState({
  children,
  action,
  variant = "box",
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  variant?: "box" | "inline";
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between",
        variant === "box"
          ? "border border-dashed border-rb-line bg-paper px-5 py-6 md:px-7"
          : "border-t border-rule px-5 py-6 md:px-7",
        className,
      )}
    >
      <p className="max-w-[60ch] text-ink-2">{children}</p>
      {action}
    </div>
  );
}
