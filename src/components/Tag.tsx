import type { ReactNode } from "react";
import type { BookRole } from "@/generated/prisma/client";
import { cx } from "@/components/cx";

/** 역할·구분 꼬리표: 상태 색을 쓰지 않는 중립 표시(틴트 바탕 + 적갈색 옅은 테두리). */
export function Tag({ strong = true, children }: { strong?: boolean; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap border border-rb-line bg-rb-tint px-[9px] py-[3px] text-[12.5px] font-bold leading-[1.3]",
        strong ? "text-ink" : "text-ink-2",
      )}
    >
      {children}
    </span>
  );
}

export function RoleTag({ role }: { role: BookRole }) {
  return role === "EDITOR" ? <Tag>편집장</Tag> : <Tag strong={false}>교사</Tag>;
}

/** 행 제목 뒤에 붙는 작은 꼬리표. 내 차례는 빨강 면, 내 파트는 틴트. */
export function TurnTag({ kind }: { kind: "turn" | "mine" }) {
  return kind === "turn" ? (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap bg-st-red px-[7px] py-[2px] text-[11px] font-bold leading-[1.3] text-white">
      내 차례
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap border border-rb-line bg-rb-tint px-[7px] py-[2px] text-[11px] font-bold leading-[1.3] text-ink-2">
      내 파트
    </span>
  );
}
