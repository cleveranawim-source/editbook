"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { InlineError } from "@/components/Field";
import { completePartAction, deleteVersionAction } from "./actions";

/** 편집장: 최신 버전을 "이 파트 완료"로 표시하거나 푼다. */
export function CompletePartButton({ partId, completed }: { partId: string; completed: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={completed ? "quiet" : "secondary"}
        pending={pending}
        onClick={() =>
          start(async () => {
            const res = await completePartAction(partId, !completed);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {completed ? "완료 취소" : "이 파트 완료"}
      </Button>
      <InlineError message={error} />
    </div>
  );
}

/** 편집장: 버전 지우기. 한 번 더 눌러 확인한다(브라우저 확인 창을 쓰지 않음). */
export function DeleteVersionButton({ versionId, number, blockedReason }: { versionId: string; number: number; blockedReason?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();
  if (blockedReason) return <span className="text-[12.5px] text-ink-3">{blockedReason}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {confirming ? (
        <>
          <span className="text-[13px] font-bold text-st-red-fg">v{number}을(를) 지울까요? 되돌릴 수 없습니다.</span>
          <Button
            size="sm"
            variant="danger"
            pending={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteVersionAction(versionId);
                if (!res.ok) setError(res.error);
                else {
                  setConfirming(false);
                  router.replace("?");
                  router.refresh();
                }
              })
            }
          >
            지우기
          </Button>
          <Button size="sm" variant="quiet" disabled={pending} onClick={() => setConfirming(false)}>
            취소
          </Button>
        </>
      ) : (
        <Button size="sm" variant="quietDanger" onClick={() => setConfirming(true)}>
          버전 삭제
        </Button>
      )}
      <InlineError message={error} />
    </span>
  );
}
