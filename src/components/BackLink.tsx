import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/cx";
import { ChevronLeft } from "@/components/icons";

/** 위 단계로 돌아가는 링크: 왼쪽 꺾쇠 + 글자, 누르는 높이 44px. */
export function BackLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cx(
        "-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-[15px] font-medium text-ink-2 no-underline transition-colors hover:text-ink hover:underline",
        className,
      )}
    >
      <ChevronLeft />
      {children}
    </Link>
  );
}
