"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/Field";

/** 버전 고르기: 바꾸면 ?v=번호로 이동한다. */
export function VersionSelect({ versions, current }: { versions: { number: number; label: string }[]; current: number }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-bold">버전</span>
      <Select
        value={current}
        onChange={(e) => router.push(`?v=${e.currentTarget.value}`)}
        className="w-auto min-w-40 py-1.5"
        aria-label="버전 고르기"
      >
        {versions.map((v) => (
          <option key={v.number} value={v.number}>
            {v.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
