"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { headerActionClassName } from "@/components/layout/header-action";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

/**
 * Theme-dependent attributes render only after mount.
 * Native button avoids Base UI useId churn in the sticky header (#418).
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = mounted
    ? isDark
      ? "Светлая тема"
      : "Тёмная тема"
    : "Переключить тему";

  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-[background-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-premium)] hover:bg-muted hover:text-foreground active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.375rem]",
        headerActionClassName(className),
      )}
      aria-label={label}
      title={label}
      disabled={!mounted}
      suppressHydrationWarning
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </button>
  );
}
