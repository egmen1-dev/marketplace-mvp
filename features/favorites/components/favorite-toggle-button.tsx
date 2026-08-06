"use client";

import { Heart, Loader2 } from "lucide-react";

import { useFavorite } from "@/features/favorites/components/favorites-provider";
import { cn } from "@/lib/utils";

type FavoriteToggleButtonProps = {
  productId: string;
  className?: string;
  /** Absolute overlay on product card media. */
  absolute?: boolean;
};

export function FavoriteToggleButton({
  productId,
  className,
  absolute = false,
}: FavoriteToggleButtonProps) {
  const { isFavorite, toggle, isPending } = useFavorite(productId);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
      aria-pressed={isFavorite}
      aria-busy={isPending}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-[color,transform,background-color,opacity] duration-[var(--duration-fast)] hover:scale-105 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-70",
        absolute && "absolute top-2.5 right-2.5",
        isFavorite && "text-primary",
        className,
      )}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Heart
          className={cn("size-4", isFavorite && "fill-primary")}
          aria-hidden
        />
      )}
    </button>
  );
}
