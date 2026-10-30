import type { Part, User } from "@/generated/prisma/client";
import { computePartStatus } from "@/lib/part-status";
import { StatusBadge } from "@/components/StatusBadge";

export function PartRow({ part, mine }: { part: Part & { assignee: User | null }; mine: boolean }) {
  // 2·3단계에서 실제 입력값으로 바뀐다.
  const status = computePartStatus({ hasVersion: false, openRequests: 0, awaitingReview: 0, completed: false });
  return (
    <li className={`flex flex-col gap-1 rounded border border-gray-300 p-3 ${mine ? "bg-amber-50" : ""}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-gray-600">{part.order}</span>
        <span className="min-w-0 break-words font-semibold">{part.title}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm text-gray-600">
          {part.assignee ? `담당 ${part.assignee.name}` : "담당 없음"}
        </span>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {mine && <StatusBadge tone="gray">내 파트</StatusBadge>}
      </div>
    </li>
  );
}
