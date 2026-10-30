import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cx } from "@/components/cx";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "quietDanger";
export type ButtonSize = "md" | "sm";

const BASE =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap leading-tight no-underline " +
  "transition-[background-color,border-color,color] duration-150 ease-paper active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress";

const VARIANT: Record<ButtonVariant, string> = {
  // 잉크 검정 면에 적갈색 밑줄 3px.
  primary: "border-b-[3px] border-rb bg-ink pt-3 pb-[9px] text-[15px] font-bold text-white hover:bg-black",
  secondary: "border border-ink bg-paper text-[15px] font-bold text-ink hover:bg-rb-tint",
  quiet: "border border-quiet bg-paper text-sm font-medium text-ink-2 hover:border-ink-3 hover:text-ink",
  danger: "border border-st-red bg-paper text-sm font-bold text-st-red-fg hover:bg-st-red-bg",
  // 목록마다 되풀이되는 제거: 평소엔 조용한 테두리, 손이 가면 빨강.
  quietDanger:
    "border border-quiet bg-paper text-sm font-bold text-st-red-fg hover:border-st-red hover:bg-st-red-bg",
};

/** 가로 여백은 따로 둔다: 아이콘 버튼(square)은 여백 없이 정사각형. */
const PAD_X: Record<ButtonVariant, string> = {
  primary: "px-5",
  secondary: "px-4",
  quiet: "px-3",
  danger: "px-3",
  quietDanger: "px-3",
};

const SIZE: Record<ButtonSize, string> = {
  md: "min-h-11",
  // 보이는 높이 34px, 누르는 자리 44px.
  sm: "hit-44 min-h-[34px] text-[13px]!",
};

/** 정사각 아이콘 버튼: 좁은 화면 44px, 넓은 화면 36px(누르는 자리는 44px 유지). */
const SQUARE = "hit-44 size-11 shrink-0 lg:size-9 lg:min-h-0";

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  className?: string,
  square = false,
) {
  return cx(BASE, VARIANT[variant], square ? SQUARE : cx(PAD_X[variant], SIZE[size]), className);
}

export function Button({
  variant = "secondary",
  size = "md",
  pending = false,
  pendingLabel,
  square = false,
  type = "button",
  disabled,
  className,
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 서버 작업 중: 누를 수 없고 aria-busy. pendingLabel이 있으면 글자를 바꾼다. */
  pending?: boolean;
  pendingLabel?: ReactNode;
  square?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonClass(variant, size, className, square)}
      {...rest}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: { variant?: ButtonVariant; size?: ButtonSize } & ComponentProps<typeof Link>) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
