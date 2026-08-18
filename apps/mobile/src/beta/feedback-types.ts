export type BetaFeedbackCategory =
  | "bug_report"
  | "idea"
  | "confusing_ui"
  | "performance_issue"
  | "payment_issue"
  | "seller_issue"
  | "buyer_issue"
  | "feature_request";

export const FEEDBACK_CATEGORIES: Array<{ id: BetaFeedbackCategory; label: string }> = [
  { id: "bug_report", label: "Сообщить об ошибке" },
  { id: "idea", label: "Идея" },
  { id: "confusing_ui", label: "Непонятный интерфейс" },
  { id: "performance_issue", label: "Проблема с производительностью" },
  { id: "payment_issue", label: "Проблема с оплатой" },
  { id: "seller_issue", label: "Проблема продавца" },
  { id: "buyer_issue", label: "Проблема покупателя" },
  { id: "feature_request", label: "Запрос функции" },
];
