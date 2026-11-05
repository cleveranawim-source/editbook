import Link from "next/link";
import { cx } from "@/components/cx";

/** 파트 편집실의 두 갈래: 원고·요청 / 자료함. */
export function PartTabs({
  bookId,
  partId,
  active,
  materialCount,
  openRequests,
}: {
  bookId: string;
  partId: string;
  active: "manuscript" | "materials";
  materialCount: number;
  openRequests: number;
}) {
  const base = `/books/${bookId}/parts/${partId}`;
  const tab = (href: string, on: boolean, label: string, count?: number) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={cx(
        "-mb-px inline-flex min-h-11 items-center gap-2 border-b-[3px] px-4 text-[15px] font-bold no-underline transition-colors",
        on ? "border-rb text-ink" : "border-transparent text-ink-2 hover:text-ink",
      )}
    >
      {label}
      {count !== undefined && <span className="font-medium text-ink-3">{count}</span>}
    </Link>
  );
  return (
    <nav aria-label="파트 메뉴" className="-mb-4 flex gap-1 border-b border-rb-line">
      {tab(base, active === "manuscript", "원고·요청", openRequests || undefined)}
      {tab(`${base}/materials`, active === "materials", "자료함", materialCount)}
    </nav>
  );
}
