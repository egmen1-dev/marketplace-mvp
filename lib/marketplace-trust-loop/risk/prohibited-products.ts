/** Rule-based prohibited product keyword detection (advisory + moderation gate). */
const PROHIBITED_PATTERNS: { id: string; label: string; patterns: RegExp[] }[] = [
  {
    id: "weapons",
    label: "Оружие и боеприпасы",
    patterns: [/оружие/i, /пистолет/i, /винтовк/i, /боеприпас/i],
  },
  {
    id: "drugs",
    label: "Запрещённые вещества",
    patterns: [/наркот/i, /марихуан/i, /кокаин/i, /героин/i],
  },
  {
    id: "counterfeit",
    label: "Контрафакт",
    patterns: [/реплика 1:1/i, /копия бренда/i, /fake luxury/i],
  },
  {
    id: "dangerous-chem",
    label: "Опасная химия",
    patterns: [/кислот.*концентр/i, /mercury/i, /ртуть/i],
  },
];

export type ProhibitedCheckResult = {
  hit: boolean;
  ruleId?: string;
  label?: string;
};

export function detectProhibitedProduct(input: {
  name: string;
  description?: string | null;
}): ProhibitedCheckResult {
  const text = `${input.name} ${input.description ?? ""}`;
  for (const rule of PROHIBITED_PATTERNS) {
    if (rule.patterns.some((p) => p.test(text))) {
      return { hit: true, ruleId: rule.id, label: rule.label };
    }
  }
  return { hit: false };
}

export { PROHIBITED_PATTERNS };
