"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { headerActionClassName } from "@/components/layout/header-action";
import { Button } from "@/components/ui/button";

type ThemeToggleProps = {
  className?: string;
};

/**
 * Theme-dependent attributes (icon, aria-label) render only after mount
 * so SSR HTML matches the first client paint and avoids React #418.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  // Stable until mounted — must match server HTML.
  const label = mounted
    ? isDark
      ? "Светлая тема"
      : "Тёмная тема"
    : "Переключить тему";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-header"
      className={headerActionClassName(className)}
      aria-label={label}
      title={label}
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
