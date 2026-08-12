"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CharacteristicDefinitionDto } from "@/features/taxonomy/queries";

type Props = {
  definitions: CharacteristicDefinitionDto[];
  /** Prefill from existing product values: definitionId → raw string */
  defaults?: Record<string, string>;
  disabled?: boolean;
};

export function DynamicCharacteristicsFields({
  definitions,
  defaults = {},
  disabled,
}: Props) {
  if (!definitions.length) return null;

  return (
    <fieldset className="space-y-4 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-medium">Характеристики</legend>
      <p className="text-xs text-muted-foreground">
        Поля зависят от выбранного типа товара. Обязательные отмечены *.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {definitions.map((d) => {
          const name = `charc_${d.id}`;
          const label = `${d.name}${d.required ? " *" : ""}${d.unit ? ` (${d.unit})` : ""}`;
          const defVal = defaults[d.id] ?? "";

          if (d.type === "BOOLEAN") {
            return (
              <label
                key={d.id}
                className="flex items-center gap-2 text-sm sm:col-span-2"
              >
                <input
                  type="checkbox"
                  name={name}
                  value="true"
                  defaultChecked={defVal === "true"}
                  disabled={disabled}
                  className="size-4 rounded border"
                />
                {label}
              </label>
            );
          }

          const hasOptions = (d.options?.length ?? 0) > 0;
          if (
            (d.type === "SELECT" ||
              d.type === "SIZE" ||
              d.type === "COLOR") &&
            hasOptions
          ) {
            return (
              <div key={d.id} className="space-y-1.5">
                <Label htmlFor={name}>{label}</Label>
                <select
                  id={name}
                  name={name}
                  defaultValue={defVal}
                  disabled={disabled}
                  required={d.required}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {(d.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (d.type === "MULTISELECT") {
            return (
              <div key={d.id} className="space-y-1.5 sm:col-span-2">
                <Label>{label}</Label>
                <div className="flex flex-wrap gap-3">
                  {(d.options ?? []).map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        name={`${name}[]`}
                        value={opt}
                        defaultChecked={defVal.split(",").includes(opt)}
                        disabled={disabled}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={d.id} className="space-y-1.5">
              <Label htmlFor={name}>{label}</Label>
              <Input
                id={name}
                name={name}
                type={d.type === "NUMBER" ? "number" : "text"}
                step={d.type === "NUMBER" ? "any" : undefined}
                defaultValue={defVal}
                disabled={disabled}
                required={d.required}
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
