import type { ReactNode } from "react";
import { cx } from "@/components/cx";

/** 화면 제목: 세리프 28px. 개수는 옆에 산세리프로 조용히. */
export function PageHeader({
  title,
  count,
  children,
  className,
}: {
  title: ReactNode;
  count?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mb-6", className)}>
      <h1 className="flex flex-wrap items-baseline gap-x-3 font-serif text-[28px] font-black leading-[1.25] tracking-[-0.01em]">
        <span className="min-w-0">{title}</span>
        {count && <span className="font-sans text-base font-medium tracking-normal text-ink-3">{count}</span>}
      </h1>
      {children}
    </div>
  );
}
