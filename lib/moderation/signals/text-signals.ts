import { buildReason } from "../policies/registry";
import type { ModerationReason, ModerationSignal } from "../types";

const PHONE_PATTERNS = [
  /(?:\+7|8)[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-()]*\d{2}[\s\-()]*\d{2}/,
  /\b\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b/,
];

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_PATTERN = /https?:\/\/|www\./i;
const TELEGRAM_PATTERN = /(?:t\.me\/|telegram|телеграм|@\w{4,})/i;
const WHATSAPP_PATTERN = /whatsapp|ватсап|wa\.me/i;

export function analyzeTextSignals(input: {
  title: string;
  description?: string | null;
}): { reasons: ModerationReason[]; signals: ModerationSignal[] } {
  const text = `${input.title}\n${input.description ?? ""}`.trim();
  const reasons: ModerationReason[] = [];
  const signals: ModerationSignal[] = [];

  if (PHONE_PATTERNS.some((pattern) => pattern.test(text))) {
    reasons.push(
      buildReason("CONTACT_INFO_IN_TEXT", "CONTACT_PHONE_TEXT_V1", {
        severity: "MEDIUM",
        userMessage: "Уберите номер телефона из описания ЛОТа.",
        adminMessage: "Contact phone detected in text",
        remediation: "Удалите контактные данные и отправьте ЛОТ ещё раз.",
      }),
    );
    signals.push({
      id: "contact-phone",
      category: "CONTACT_INFO",
      weight: 30,
      message: "Phone pattern in text",
      ruleId: "CONTACT_PHONE_TEXT_V1",
    });
  }

  if (EMAIL_PATTERN.test(text)) {
    reasons.push(
      buildReason("CONTACT_INFO_IN_TEXT", "CONTACT_EMAIL_TEXT_V1", {
        severity: "MEDIUM",
        userMessage: "Уберите email из описания ЛОТа.",
        adminMessage: "Email detected in text",
        remediation: "Удалите контактные данные и отправьте ЛОТ ещё раз.",
      }),
    );
    signals.push({
      id: "contact-email",
      category: "CONTACT_INFO",
      weight: 25,
      message: "Email in text",
      ruleId: "CONTACT_EMAIL_TEXT_V1",
    });
  }

  if (TELEGRAM_PATTERN.test(text) || WHATSAPP_PATTERN.test(text)) {
    reasons.push(
      buildReason("CONTACT_INFO_IN_TEXT", "CONTACT_MESSENGER_TEXT_V1", {
        severity: "MEDIUM",
        userMessage: "Уберите ссылки на мессенджеры из описания.",
        adminMessage: "Messenger bypass detected",
        remediation: "Общение с покупателями — только через ЛОТ.",
      }),
    );
    signals.push({
      id: "contact-messenger",
      category: "CONTACT_INFO",
      weight: 28,
      message: "Messenger reference in text",
      ruleId: "CONTACT_MESSENGER_TEXT_V1",
    });
  }

  if (URL_PATTERN.test(text)) {
    reasons.push(
      buildReason("EXTERNAL_LINK", "EXTERNAL_LINK_TEXT_V1", {
        severity: "MEDIUM",
        userMessage: "Уберите внешние ссылки из описания.",
        adminMessage: "External URL in text",
        remediation: "Опишите товар без ссылок на другие площадки.",
      }),
    );
    signals.push({
      id: "external-link",
      category: "EXTERNAL_LINK",
      weight: 20,
      message: "URL in text",
      ruleId: "EXTERNAL_LINK_TEXT_V1",
    });
  }

  return { reasons, signals };
}
