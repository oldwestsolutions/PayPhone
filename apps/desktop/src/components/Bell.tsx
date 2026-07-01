export const BELL_SVG_PATH =
  "M12 2.25c-1.07 0-2.02.58-2.53 1.44L6.12 9.75h11.76l-3.35-6.06A2.93 2.93 0 0012 2.25zm-5.88 9v1.13c0 3.52 2.09 6.56 5.11 7.93V21a1 1 0 001 1h3.54a1 1 0 001-1v-.69c3.02-1.37 5.11-4.41 5.11-7.93V11.25H6.12z";

export function Bell({ className = "", animate = false, size = 32 }: { className?: string; animate?: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`bell-icon ${animate ? "bell-ring" : ""} ${className}`}
      fill="currentColor"
      aria-hidden
    >
      <path d={BELL_SVG_PATH} />
    </svg>
  );
}
