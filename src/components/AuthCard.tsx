import type { ReactNode } from "react";
import { Card } from "@/components/Card";

/** 로그인·비밀번호 설정·404: 원고지 한가운데 놓인 종이 한 장. 폭 392px = 작은 칸 14개. */
export function AuthCard({ title, lead, children }: { title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100dvh_-_var(--bar-h)_-_84px)] place-items-center">
      <Card padding="lg" className="w-full max-w-[392px]">
        <h1 className="font-serif text-[28px] font-black leading-[1.25] tracking-[-0.01em]">{title}</h1>
        <p className="mt-1.5 text-ink-2">{lead}</p>
        <div className="mt-7">{children}</div>
      </Card>
    </div>
  );
}
