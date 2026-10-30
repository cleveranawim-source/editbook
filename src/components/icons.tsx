/** 1.5px 선으로 그린 꺾쇠. 글자색을 따른다. */
function Chevron({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

export const ChevronUp = (p: { size?: number }) => <Chevron d="M3.5 10.25 8 5.75l4.5 4.5" {...p} />;
export const ChevronDown = (p: { size?: number }) => <Chevron d="M3.5 5.75 8 10.25l4.5-4.5" {...p} />;
export const ChevronLeft = (p: { size?: number }) => <Chevron d="M10.25 3.5 5.75 8l4.5 4.5" {...p} />;
