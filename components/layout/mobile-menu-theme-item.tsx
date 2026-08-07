"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

/**
 * Theme control for the mobile overflow menu (avoids nesting ThemeToggle button).
 */
export function MobileMenuThemeItem() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <DropdownMenuItem disabled className="text-muted-foreground">
        Тема
      </DropdownMenuItem>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenuItem
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
      {isDark ? "Светлая тема" : "Тёмная тема"}
    </DropdownMenuItem>
  );
}
