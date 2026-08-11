"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  name?: string;
  defaultValue?: number;
  disabled?: boolean;
};

/** Interactive 1–5 star picker; writes to a hidden input for form submission. */
export function RatingInput({ name = "rating", defaultValue = 0, disabled }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1" data-testid="rating-input">
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          aria-label={`${star} из 5`}
          data-testid={`rating-star-${star}`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => setValue(star)}
          className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Star
            className={cn(
              "size-7 transition-colors",
              star <= shown
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
