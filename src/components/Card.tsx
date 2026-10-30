import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/components/cx";

type Padding = "none" | "md" | "lg";

const PAD: Record<Padding, string> = {
  none: "",
  md: "p-5",
  lg: "p-6 sm:p-8",
};

/** 원고지 위에 놓인 흰 종이. 모서리를 둥글리지 않고 그림자도 없다. */
export function Card({
  as: Tag = "div",
  padding = "none",
  className,
  children,
  ...rest
}: {
  as?: "div" | "section" | "header" | "nav" | "article" | "aside";
  padding?: Padding;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cx("border border-rb-line bg-paper", PAD[padding], className)} {...rest}>
      {children}
    </Tag>
  );
}

/** 카드 안 구역 제목: 세리프 20px, 옆에 개수를 조용히 붙인다. */
export function CardTitle({
  id,
  count,
  children,
  className,
}: {
  id?: string;
  count?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 id={id} className={cx("flex items-baseline gap-2 font-serif text-xl font-bold leading-tight", className)}>
      {children}
      {count && <span className="font-sans text-[15px] font-medium text-ink-3">{count}</span>}
    </h2>
  );
}

/** 카드 아래쪽 틴트 띠: 추가·만들기 양식을 담는다. */
export function CardBand({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-rb-line bg-rb-tint px-5 pb-6 pt-5 md:px-7">
      <h3 className="text-base font-bold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
