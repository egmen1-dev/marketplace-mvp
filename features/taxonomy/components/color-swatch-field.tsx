"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Common marketplace color names → CSS hex for swatches. */
const COLOR_HEX: Record<string, string> = {
  чёрный: "#1a1a1a",
  черный: "#1a1a1a",
  белый: "#f5f5f5",
  серый: "#9ca3af",
  красный: "#dc2626",
  синий: "#2563eb",
  зелёный: "#16a34a",
  зеленый: "#16a34a",
  жёлтый: "#eab308",
  желтый: "#eab308",
  оранжевый: "#ea580c",
  розовый: "#ec4899",
  фиолетовый: "#9333ea",
  коричневый: "#92400e",
  бежевый: "#d6c4a8",
  золотой: "#ca8a04",
  серебряный: "#a8a29e",
};

function swatchHex(label: string): string | null {
  const key = label.trim().toLowerCase().replace(/ё/g, "е");
  return COLOR_HEX[key] ?? null;
}

type Props = {
  id: string;
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
};

export function ColorSwatchField({
  id,
  name,
  label,
  options,
  defaultValue = "",
  required,
  disabled,
}: Props) {
  const hasOptions = options.length > 0;

  if (!hasOptions) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <input
          id={id}
          name={name}
          type="text"
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          placeholder="Например: чёрный"
          className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
        />
      </div>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const hex = swatchHex(opt);
          const checked = defaultValue === opt;
          return (
            <label
              key={opt}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm transition-colors",
                checked
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt}
                defaultChecked={checked}
                disabled={disabled}
                required={required && !defaultValue}
                className="sr-only"
              />
              <span
                className="size-5 shrink-0 rounded-full ring-1 ring-border"
                style={{
                  backgroundColor: hex ?? "var(--muted)",
                }}
                aria-hidden
              />
              {opt}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
