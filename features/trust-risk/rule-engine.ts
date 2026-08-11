import type { RiskEventType, RiskSeverity } from "@prisma/client";

import {
  MIN_CONFIDENCE_TO_RAISE,
  resolveEffect,
  type RuleEffect,
} from "./config";

/**
 * Centralized Rule Engine (AGENT-019, sections 10/11). Code-config driven (no
 * no-code builder). Analysis-first: default effects are LOG_ONLY / ADMIN_REVIEW;
 * enforcing effects are downgraded unless RISK_ENFORCEMENT_ENABLED (config).
 */

export type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  type: RiskEventType;
  /** Default severity when this rule fires (may be overridden by score). */
  severity: RiskSeverity;
  /** Intended effect (subject to the enforcement flag at decision time). */
  effect: RuleEffect;
  version: number;
  description: string;
};

/** The rule registry. Most rules are LOG_ONLY / ADMIN_REVIEW by design. */
export const RULES: Rule[] = [
  { id: "price-outlier", name: "Аномальная цена", enabled: true, type: "PRICE_OUTLIER", severity: "MEDIUM", effect: "ADMIN_REVIEW", version: 1, description: "Цена значительно ниже медианы типа товара" },
  { id: "duplicate-listing", name: "Дубль объявления", enabled: true, type: "DUPLICATE_LISTING", severity: "MEDIUM", effect: "ADMIN_REVIEW", version: 1, description: "Почти идентичное объявление того же продавца" },
  { id: "self-deal", name: "Self-deal", enabled: true, type: "SELF_DEAL_INDICATOR", severity: "HIGH", effect: "ADMIN_REVIEW", version: 1, description: "Покупка собственного товара" },
  { id: "rapid-orders", name: "Быстрые заказы", enabled: true, type: "RAPID_ORDER_CREATION", severity: "MEDIUM", effect: "LOG_ONLY", version: 1, description: "Много заказов за короткое время" },
  { id: "rapid-reservations", name: "Быстрые брони", enabled: true, type: "RAPID_RESERVATION_CREATION", severity: "MEDIUM", effect: "LOG_ONLY", version: 1, description: "Много броней за короткое время" },
  { id: "excessive-cancellations", name: "Частые отмены", enabled: true, type: "EXCESSIVE_CANCELLATIONS", severity: "MEDIUM", effect: "ADMIN_REVIEW", version: 1, description: "Высокая доля отмен покупателем" },
  { id: "excessive-rejections", name: "Частые отказы", enabled: true, type: "EXCESSIVE_REJECTIONS", severity: "MEDIUM", effect: "ADMIN_REVIEW", version: 1, description: "Продавец часто отклоняет брони" },
  { id: "review-abuse", name: "Злоупотребление отзывами", enabled: true, type: "REVIEW_ABUSE_INDICATOR", severity: "MEDIUM", effect: "ADMIN_REVIEW", version: 1, description: "Всплеск/повтор попыток отзыва" },
  { id: "chat-spam", name: "Спам в чате", enabled: true, type: "CHAT_SPAM_PATTERN", severity: "LOW", effect: "LOG_ONLY", version: 1, description: "Повтор одинаковых сообщений" },
  { id: "unusual-value", name: "Необычная сумма", enabled: true, type: "UNUSUAL_TRANSACTION_VALUE", severity: "MEDIUM", effect: "LOG_ONLY", version: 1, description: "Сумма сделки сильно выше обычной" },
  { id: "failed-auth", name: "Подбор входа", enabled: true, type: "FAILED_AUTH_PATTERN", severity: "HIGH", effect: "ADMIN_REVIEW", version: 1, description: "Серия неудачных входов" },
  { id: "buyer-no-show", name: "Неявки покупателя", enabled: true, type: "BUYER_NO_SHOW_PATTERN", severity: "MEDIUM", effect: "ADMIN_REVIEW", version: 1, description: "Повторные неявки за товаром" },
  { id: "seller-degradation", name: "Снижение исполнения", enabled: true, type: "SELLER_FULFILLMENT_DEGRADATION", severity: "MEDIUM", effect: "ADMIN_REVIEW", version: 1, description: "Ухудшение показателей исполнения продавца" },
  { id: "multi-account", name: "Мульти-аккаунт", enabled: true, type: "MULTIPLE_ACCOUNT_INDICATOR", severity: "MEDIUM", effect: "LOG_ONLY", version: 1, description: "Признаки связанных аккаунтов" },
];

const RULE_BY_TYPE = new Map(RULES.map((r) => [r.type, r]));

export function getRule(type: RiskEventType): Rule | undefined {
  return RULE_BY_TYPE.get(type);
}

export type SignalDecision = {
  effect: RuleEffect;
  severity: RiskSeverity;
  raised: boolean;
  ruleId: string | null;
};

/**
 * Decide the effect for a raised signal. Low confidence stays LOG_ONLY
 * (false-positive safety, section 40). Enforcing effects are gated by the flag.
 */
export function decideSignal(input: {
  type: RiskEventType;
  severity: RiskSeverity;
  confidence: number;
}): SignalDecision {
  const rule = getRule(input.type);
  if (!rule || !rule.enabled) {
    return { effect: "LOG_ONLY", severity: input.severity, raised: false, ruleId: null };
  }
  if (input.confidence < MIN_CONFIDENCE_TO_RAISE) {
    return { effect: "LOG_ONLY", severity: input.severity, raised: true, ruleId: rule.id };
  }
  return {
    effect: resolveEffect(rule.effect),
    severity: input.severity,
    raised: true,
    ruleId: rule.id,
  };
}
