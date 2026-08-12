"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorSwatchField } from "@/features/taxonomy/components/color-swatch-field";
import type { CharacteristicDefinitionDto } from "@/features/taxonomy/queries";

type Props = {
  definitions: CharacteristicDefinitionDto[];
  /** Prefill from existing product values: definitionId → raw string */
  defaults?: Record<string, string>;
  disabled?: boolean;
};

function CharField({
  d,
  defaults,
  disabled,
}: {
  d: CharacteristicDefinitionDto;
  defaults: Record<string, string>;
  disabled?: boolean;
}) {
  const name = `charc_${d.id}`;
  const label = `${d.name}${d.required ? " *" : ""}${d.unit ? ` (${d.unit})` : ""}`;
  const defVal = defaults[d.id] ?? "";

  if (d.type === "BOOLEAN") {
    return (
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
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

  if (d.type === "COLOR") {
    return (
      <div className="sm:col-span-2">
        <ColorSwatchField
          id={name}
          name={name}
          label={label}
          options={d.options ?? []}
          defaultValue={defVal}
          required={d.required}
          disabled={disabled}
        />
      </div>
    );
  }

  if (d.type === "SELECT" || d.type === "SIZE") {
    return (
      <div className="space-y-1.5">
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
      <div className="space-y-1.5 sm:col-span-2">
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
    <div className="space-y-1.5">
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
}

function Section({
  title,
  hint,
  defs,
  defaults,
  disabled,
}: {
  title: string;
  hint: string;
  defs: CharacteristicDefinitionDto[];
  defaults: Record<string, string>;
  disabled?: boolean;
}) {
  if (!defs.length) return null;
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {defs.map((d) => (
          <CharField key={d.id} d={d} defaults={defaults} disabled={disabled} />
        ))}
      </div>
    </div>
  );
}

export function DynamicCharacteristicsFields({
  definitions,
  defaults = {},
  disabled,
}: Props) {
  if (!definitions.length) return null;

  const required = definitions.filter((d) => d.required);
  const filterable = definitions.filter((d) => !d.required && d.filterable);
  const recommended = definitions.filter((d) => !d.required && !d.filterable);

  return (
    <fieldset className="space-y-6 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-medium">Характеристики</legend>
      <p className="text-xs text-muted-foreground">
        Поля зависят от выбранного типа товара. Обязательные нужны для публикации.
      </p>
      <Section
        title="Обязательные"
        hint="Без этих полей товар нельзя опубликовать"
        defs={required}
        defaults={defaults}
        disabled={disabled}
      />
      <Section
        title="Фильтруемые"
        hint="Попадают в фильтры каталога"
        defs={filterable}
        defaults={defaults}
        disabled={disabled}
      />
      <Section
        title="Рекомендуемые"
        hint="Улучшают карточку и поиск"
        defs={recommended}
        defaults={defaults}
        disabled={disabled}
      />
    </fieldset>
  );
}
