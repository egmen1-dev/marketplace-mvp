import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Native input (not Base UI Field.Control).
 * Field.Control’s labelable id + iso-layout autofill hooks caused intermittent
 * React #418 under Playwright suite load; a plain input with
 * suppressHydrationWarning is stable for SSR hydration.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      suppressHydrationWarning
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input bg-surface px-3.5 py-2 text-base text-foreground transition-all duration-[var(--duration-fast)] ease-[var(--ease-out-premium)] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
