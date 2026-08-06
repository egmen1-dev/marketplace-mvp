"use client";

import { Button } from "@/components/ui/button";
import { toastComingSoon } from "@/lib/toasts";
import { cn } from "@/lib/utils";

type ComingSoonButtonProps = {
  label: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
  className?: string;
};

/** Interactive control for unfinished features — always shows a toast. */
export function ComingSoonButton({
  label,
  variant = "outline",
  size = "default",
  className,
}: ComingSoonButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={() => toastComingSoon()}
    >
      {label}
    </Button>
  );
}
