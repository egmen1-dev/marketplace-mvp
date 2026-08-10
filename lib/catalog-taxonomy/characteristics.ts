/**
 * Validate product characteristic values against ProductType definitions.
 */

import type { CharacteristicValueType } from "@prisma/client";

export type CharDefinitionInput = {
  id: string;
  name: string;
  slug: string;
  type: CharacteristicValueType;
  required: boolean;
  options?: unknown;
};

export type CharValueInput = {
  definitionId: string;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueJson?: unknown;
};

export type CharValidationIssue = {
  definitionId: string;
  name: string;
  message: string;
};

function isEmptyValue(v: CharValueInput): boolean {
  const hasText = Boolean(v.valueText?.trim());
  const hasNum = v.valueNumber != null && !Number.isNaN(v.valueNumber);
  const hasBool = v.valueBoolean != null;
  const hasJson =
    v.valueJson != null &&
    !(Array.isArray(v.valueJson) && v.valueJson.length === 0);
  return !hasText && !hasNum && !hasBool && !hasJson;
}

function optionsList(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map(String);
}

export function validateCharacteristicValues(
  definitions: CharDefinitionInput[],
  values: CharValueInput[],
): CharValidationIssue[] {
  const byDef = new Map(values.map((v) => [v.definitionId, v]));
  const issues: CharValidationIssue[] = [];

  for (const def of definitions) {
    const v = byDef.get(def.id);
    if (!v || isEmptyValue(v)) {
      if (def.required) {
        issues.push({
          definitionId: def.id,
          name: def.name,
          message: `Заполните обязательную характеристику «${def.name}»`,
        });
      }
      continue;
    }

    const opts = optionsList(def.options);

    switch (def.type) {
      case "NUMBER":
        if (v.valueNumber == null || Number.isNaN(v.valueNumber)) {
          issues.push({
            definitionId: def.id,
            name: def.name,
            message: `«${def.name}» должна быть числом`,
          });
        }
        break;
      case "BOOLEAN":
        if (v.valueBoolean == null) {
          issues.push({
            definitionId: def.id,
            name: def.name,
            message: `Укажите «${def.name}»`,
          });
        }
        break;
      case "SELECT":
      case "SIZE":
      case "COLOR": {
        const text = v.valueText?.trim() ?? "";
        if (!text) {
          issues.push({
            definitionId: def.id,
            name: def.name,
            message: `Выберите «${def.name}»`,
          });
        } else if (opts.length && !opts.includes(text)) {
          issues.push({
            definitionId: def.id,
            name: def.name,
            message: `Недопустимое значение «${def.name}»`,
          });
        }
        break;
      }
      case "MULTISELECT": {
        const arr = Array.isArray(v.valueJson)
          ? v.valueJson.map(String)
          : v.valueText
            ? [v.valueText]
            : [];
        if (!arr.length) {
          issues.push({
            definitionId: def.id,
            name: def.name,
            message: `Выберите «${def.name}»`,
          });
        } else if (opts.length && arr.some((x) => !opts.includes(x))) {
          issues.push({
            definitionId: def.id,
            name: def.name,
            message: `Недопустимое значение «${def.name}»`,
          });
        }
        break;
      }
      case "TEXT":
      default:
        if (!v.valueText?.trim()) {
          issues.push({
            definitionId: def.id,
            name: def.name,
            message: `Заполните «${def.name}»`,
          });
        }
        break;
    }
  }

  return issues;
}

/** Missing required defs → block ACTIVE publish (DRAFT ok). */
export function canPublishActive(
  definitions: CharDefinitionInput[],
  values: CharValueInput[],
): { ok: true } | { ok: false; issues: CharValidationIssue[] } {
  const issues = validateCharacteristicValues(definitions, values);
  if (issues.length) return { ok: false, issues };
  return { ok: true };
}
