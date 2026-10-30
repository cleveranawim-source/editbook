import type { CSSProperties } from "react";
import type { PartStatus } from "@/lib/part-status";
import { cx } from "@/components/cx";

/** 원고·검토·확인·완료: 채워진 칸 수. */
const FILLED: Record<PartStatus["kind"], number> = {
  NO_MANUSCRIPT: 0,
  EDITOR_REVIEW: 1,
  REQUESTS: 2,
  AWAITING: 3,
  DONE: 4,
};

export function ProgressStrip({ kind }: { kind: PartStatus["kind"] }) {
  const filled = FILLED[kind];
  const done = kind === "DONE";
  return (
    <span role="img" aria-label={`진행 ${filled}/4`} className="inline-flex shrink-0 items-center gap-[3px]">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          aria-hidden
          className={cx("cell", i < filled && "fill", done && "done")}
          style={i < filled ? ({ "--i": i } as CSSProperties) : undefined}
        />
      ))}
    </span>
  );
}
