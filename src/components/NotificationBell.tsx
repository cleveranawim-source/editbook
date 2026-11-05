"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/cx";

/** 머리 줄 종 모양. 안 읽은 수를 1분마다·창으로 돌아올 때·화면을 옮길 때 다시 센다. */
export function NotificationBell({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/notifications/count", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { count: number } | null) => {
          if (alive && j) setCount(j.count);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("focus", load);
    };
  }, [pathname]);

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `알림 ${count}개 안 읽음` : "알림"}
      className="hit-44 relative inline-flex size-[34px] shrink-0 items-center justify-center border border-quiet text-ink-2 no-underline transition-colors hover:border-ink-3 hover:text-ink"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinejoin="round" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span
          className={cx(
            "absolute -right-2 -top-2 min-w-[20px] bg-st-red px-1 text-center text-[11.5px] font-bold leading-[20px] text-white",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
