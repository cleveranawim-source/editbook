"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/Field";

export function CompareSelect({ options, a, b }: { options: { number: number; label: string }[]; a: number; b: number }) {
  const router = useRouter();
  const go = (na: number, nb: number) => router.push(`?a=${na}&b=${nb}`);
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-2">
        <span className="font-bold">앞</span>
        <Select value={a} onChange={(e) => go(Number(e.currentTarget.value), b)} className="w-auto min-w-44 py-1.5" aria-label="앞 버전">
          {options.map((o) => (
            <option key={o.number} value={o.number}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
      <span aria-hidden className="text-ink-3">
        ↔
      </span>
      <label className="flex items-center gap-2">
        <span className="font-bold">뒤</span>
        <Select value={b} onChange={(e) => go(a, Number(e.currentTarget.value))} className="w-auto min-w-44 py-1.5" aria-label="뒤 버전">
          {options.map((o) => (
            <option key={o.number} value={o.number}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
