import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/components/cx";

const CONTROL =
  "block w-full min-w-0 min-h-11 border border-field bg-paper px-3 py-2.5 text-base leading-normal text-ink " +
  "placeholder:text-ink-3 transition-[border-color] duration-150 ease-paper hover:border-ink-3 focus:border-rb " +
  "aria-invalid:border-st-red user-invalid:border-st-red " +
  "disabled:cursor-not-allowed disabled:border-rule disabled:bg-rb-tint disabled:text-ink-3";

/** 글자표(14px 굵게) 아래에 입력란. 라벨이 입력란을 감싸 저절로 이어진다. */
export function Field({
  label,
  hint,
  className,
  labelClassName,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  /** 넓은 화면에서 표 머리가 대신 이름을 알려 줄 때 `lg:sr-only` 등을 준다. */
  labelClassName?: string;
  children: ReactNode;
}) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <span className={cx("text-sm font-bold text-ink-2", labelClassName)}>{label}</span>
      {children}
      {hint && <span className="text-[13px] text-ink-2">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(CONTROL, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cx(CONTROL, "select-chevron", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(CONTROL, "resize-y", className)} {...rest} />;
}

/** 양식 오류: 버튼 위, 연한 빨강 바탕에 빨강 테두리. */
export function FormError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cx("border border-st-red bg-st-red-bg p-2.5 text-sm text-st-red-fg", className)}>
      {message}
    </p>
  );
}

/** 행 안의 짧은 오류: 상자 없이 빨강 글자만. */
export function InlineError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cx("text-sm text-st-red-fg", className)}>
      {message}
    </p>
  );
}
