import type { ReactNode } from "react";

export type Tone = "red" | "yellow" | "green" | "gray";

const TONES: Record<Tone, string> = {
  red: "bg-red-100 text-red-800",
  yellow: "bg-amber-100 text-amber-800",
  green: "bg-green-100 text-green-800",
  gray: "bg-gray-200 text-gray-700",
};

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
