import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  value: number;
  /** Pixel size of each star. */
  size?: number;
  className?: string;
  "aria-label"?: string;
};

/** Read-only star display (rounded to nearest whole star). */
export function ReviewStars({ value, size = 16, className, ...rest }: Props) {
  const rounded = Math.round(Math.max(0, Math.min(5, value)));
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={rest["aria-label"] ?? `Рейтинг ${value.toFixed(1)} из 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={cn(
            i < rounded
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/40",
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}
