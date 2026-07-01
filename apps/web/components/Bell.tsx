import { cn } from "@/lib/utils";

type BellProps = {
  className?: string;
  size?: number;
};

/**
 * Old-school bell silhouette: hanger, dome, flared lip, clapper.
 * Single component used everywhere — no legacy logo markup.
 */
export function Bell({ className, size = 40 }: BellProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      className={cn("shrink-0 block text-white", className)}
      fill="currentColor"
      aria-hidden
    >
      {/* hanger */}
      <path d="M38 2h24c8 0 14 6 14 14v10H24V16c0-8 6-14 14-14z" />
      {/* bell body */}
      <path d="M14 38c0-2 1-4 3-5C28 22 38 18 50 18s22 4 33 15c2 1 3 3 3 5v6c0 18-12 34-28 40v8H42v-8C26 78 14 62 14 44v-6z" />
      {/* clapper */}
      <circle cx="50" cy="98" r="9" />
    </svg>
  );
}
