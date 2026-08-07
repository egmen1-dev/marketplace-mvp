import { cn } from "@/lib/utils";

/**
 * Shared chrome for header toolbar icons (favorites, cart, theme, profile, menu).
 * 44×44 hit area, ~22px glyph, hover surface + tooltip via title/aria-label.
 */
export function headerActionClassName(...extra: Array<string | undefined>) {
  return cn(
    "size-11 shrink-0 rounded-xl text-muted-foreground transition-[background-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-premium)] hover:bg-muted hover:text-foreground active:scale-[0.97] [&_svg:not([class*='size-'])]:size-[1.375rem]",
    ...extra,
  );
}
