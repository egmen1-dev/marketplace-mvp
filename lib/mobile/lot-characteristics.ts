/**
 * Category-aware LOT characteristics — shared between mobile client logic and gates.
 * Characteristics are bound to ProductType (taxonomy), not Category directly.
 */

export type LotCharacteristicType =
  | "TEXT"
  | "NUMBER"
  | "SELECT"
  | "MULTISELECT"
  | "BOOLEAN"
  | "SIZE"
  | "COLOR";

export type LotCharacteristicDefinition = {
  id: string;
  name: string;
  slug: string;
  type: LotCharacteristicType | string;
  required: boolean;
  unit: string | null;
  options: string[] | null;
  sortOrder?: number;
  filterable?: boolean;
  placeholder?: string | null;
};

export type LotCharacteristicFormValue = {
  text?: string;
  number?: string;
  boolean?: boolean;
  multi?: string[];
};

export type LotCharacteristicPayload = {
  definitionId: string;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueJson?: unknown;
};

export type LotCharacteristicValidationIssue = {
  definitionId: string;
  name: string;
  message: string;
};

const FORBIDDEN_UI_PATTERNS = [
  /CHARACTERISTICS_REQUIRED/i,
  /Validation failed/i,
  /subjectId/i,
  /characteristicId/i,
  /Unsupported/i,
  /Заполните обязательную характеристику/i,
  /ProductType/i,
  /taxonomy/i,
];

export function isForbiddenCharacteristicUiMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  return FORBIDDEN_UI_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function lowerFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/** Human seller prompt for a single characteristic field. */
export function humanCharacteristicPrompt(def: Pick<LotCharacteristicDefinition, "name" | "type">): string {
  const label = lowerFirst(def.name.trim());
  switch (def.type) {
    case "SELECT":
    case "SIZE":
    case "COLOR":
    case "MULTISELECT":
      return `Выберите ${label}`;
    case "BOOLEAN":
      return `Укажите: ${label}`;
    default:
      return `Укажите ${label}`;
  }
}

export function humanCharacteristicMissingMessage(
  issues: LotCharacteristicValidationIssue[],
): string {
  if (!issues.length) return "Нужно заполнить ещё несколько данных";
  if (issues.length === 1) return issues[0]!.message;
  return "Нужно заполнить ещё несколько данных";
}

function isEmptyFormValue(def: LotCharacteristicDefinition, value: LotCharacteristicFormValue | undefined): boolean {
  if (!value) return true;
  switch (def.type) {
    case "NUMBER":
      return !value.number?.trim();
    case "BOOLEAN":
      return value.boolean == null;
    case "MULTISELECT":
      return !value.multi?.length;
    case "SELECT":
    case "SIZE":
    case "COLOR":
      return !value.text?.trim();
    default:
      return !value.text?.trim();
  }
}

export function splitCharacteristicDefinitions(definitions: LotCharacteristicDefinition[]) {
  const required = definitions.filter((d) => d.required);
  const optional = definitions.filter((d) => !d.required);
  return { required, optional };
}

export function validateLotCharacteristicForm(
  definitions: LotCharacteristicDefinition[],
  values: Record<string, LotCharacteristicFormValue>,
  options?: { onlyRequired?: boolean },
): LotCharacteristicValidationIssue[] {
  const onlyRequired = options?.onlyRequired ?? true;
  const issues: LotCharacteristicValidationIssue[] = [];

  for (const def of definitions) {
    if (onlyRequired && !def.required) continue;
    const value = values[def.id];
    if (!isEmptyFormValue(def, value)) continue;
    issues.push({
      definitionId: def.id,
      name: def.name,
      message: humanCharacteristicPrompt(def),
    });
  }

  return issues;
}

export function serializeLotCharacteristicPayload(
  definitions: LotCharacteristicDefinition[],
  values: Record<string, LotCharacteristicFormValue>,
): LotCharacteristicPayload[] {
  const out: LotCharacteristicPayload[] = [];

  for (const def of definitions) {
    const value = values[def.id];
    if (!value || isEmptyFormValue(def, value)) continue;

    switch (def.type) {
      case "NUMBER": {
        const num = Number(String(value.number ?? "").replace(",", ".").trim());
        if (!Number.isFinite(num)) continue;
        out.push({ definitionId: def.id, valueNumber: num });
        break;
      }
      case "BOOLEAN":
        out.push({
          definitionId: def.id,
          valueBoolean: Boolean(value.boolean),
          valueText: value.boolean ? "true" : "false",
        });
        break;
      case "MULTISELECT":
        out.push({
          definitionId: def.id,
          valueJson: value.multi ?? [],
          valueText: (value.multi ?? []).join(", "),
        });
        break;
      case "SELECT":
      case "SIZE":
      case "COLOR":
      case "TEXT":
      default: {
        const text = value.text?.trim();
        if (!text) continue;
        out.push({ definitionId: def.id, valueText: text });
        break;
      }
    }
  }

  return out;
}

export function formatCharacteristicPreviewValue(
  def: LotCharacteristicDefinition,
  value: LotCharacteristicFormValue | undefined,
): string | null {
  if (!value || isEmptyFormValue(def, value)) return null;
  switch (def.type) {
    case "NUMBER": {
      const num = value.number?.trim();
      if (!num) return null;
      return def.unit ? `${num} ${def.unit}` : num;
    }
    case "BOOLEAN":
      return value.boolean ? "Да" : "Нет";
    case "MULTISELECT":
      return (value.multi ?? []).join(", ") || null;
    default:
      return value.text?.trim() || null;
  }
}

/** Drop values that do not belong to the current product type schema. */
export function pruneCharacteristicValuesForSchema(
  definitions: LotCharacteristicDefinition[],
  values: Record<string, LotCharacteristicFormValue>,
): Record<string, LotCharacteristicFormValue> {
  const allowed = new Set(definitions.map((d) => d.id));
  const next: Record<string, LotCharacteristicFormValue> = {};
  for (const [id, value] of Object.entries(values)) {
    if (allowed.has(id)) next[id] = value;
  }
  return next;
}

/** Parse backend CHARACTERISTICS_REQUIRED message into definition names (best effort). */
export function parseCharacteristicNamesFromServerMessage(message: string): string[] {
  const names: string[] = [];
  const re = /«([^»]+)»/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(message)) !== null) {
    names.push(match[1]!);
  }
  return names;
}

export function mapServerCharacteristicRejection(
  code: string | undefined,
  message: string,
  definitions: LotCharacteristicDefinition[],
): {
  kind: "characteristics" | "other";
  issues: LotCharacteristicValidationIssue[];
  userMessage: string;
} {
  if (code !== "CHARACTERISTICS_REQUIRED" && !/обязательн/i.test(message)) {
    return { kind: "other", issues: [], userMessage: message };
  }

  const names = parseCharacteristicNamesFromServerMessage(message);
  const issues: LotCharacteristicValidationIssue[] = [];

  for (const name of names) {
    const def = definitions.find((d) => d.name === name);
    if (def) {
      issues.push({
        definitionId: def.id,
        name: def.name,
        message: humanCharacteristicPrompt(def),
      });
    }
  }

  if (!issues.length) {
    for (const def of definitions.filter((d) => d.required)) {
      issues.push({
        definitionId: def.id,
        name: def.name,
        message: humanCharacteristicPrompt(def),
      });
    }
  }

  return {
    kind: "characteristics",
    issues,
    userMessage: humanCharacteristicMissingMessage(issues),
  };
}

export function sanitizeCharacteristicUiError(message: string): string {
  if (!message.trim() || isForbiddenCharacteristicUiMessage(message)) {
    return "Нужно заполнить ещё несколько данных";
  }
  return message;
}
