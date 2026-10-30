import type { ReactNode } from "react";
import { cx } from "@/components/cx";

export type Tone = "red" | "yellow" | "green" | "gray";

/** 빨강 내 차례 · 노랑 상대 차례 · 초록 완료 · 회색 대기. 색만으로 말하지 않고 늘 글자를 함께 쓴다. */
const TONES: Record<Tone, string> = {
  red: "border-st-red bg-st-red-bg text-st-red-fg",
  yellow: "border-st-amber bg-st-amber-bg text-st-amber-fg",
  green: "border-st-green bg-st-green-bg text-st-green",
  gray: "border-st-gray bg-st-gray-bg text-st-gray-fg",
};

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap border px-2 py-[2px] text-sm font-bold leading-[1.35]",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
