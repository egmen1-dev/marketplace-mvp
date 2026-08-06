"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QtyStepperProps = {
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  className?: string;
};

export function QtyStepper({
  value,
  min = 1,
  max,
  disabled,
  onChange,
  className,
}: QtyStepperProps) {
  const canDec = !disabled && value > min;
  const canInc = !disabled && value < max;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-surface/60 p-0.5",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={!canDec}
        aria-label="Уменьшить количество"
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </Button>
      <span className="min-w-8 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={!canInc}
        aria-label="Увеличить количество"
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}
