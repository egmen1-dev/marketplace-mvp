import type { SellerBalanceDto } from "@/lib/finance/types";

import type { MoneyEducationSnapshot } from "./types";

export function buildMoneyEducation(input: {
  balance: SellerBalanceDto;
  payoutEnabled: boolean;
}): MoneyEducationSnapshot {
  const { balance, payoutEnabled } = input;

  return {
    pendingExplanation:
      balance.pendingAmount > 0
        ? "Заказ ещё не завершён. Средства защищены до подтверждения сделки."
        : "Нет средств в ожидании — появятся после новых продаж.",
    availableExplanation:
      balance.availableAmount > 0
        ? "Заказ выполнен. Средства можно вывести."
        : "Доступные средства появятся после завершения активных заказов.",
    payoutExplanation: payoutEnabled
      ? "Создайте заявку на вывод — сумма, способ и статус отображаются в разделе выплат."
      : "Вывод средств скоро будет доступен после завершения сделок.",
    flowSteps: [
      "Оплата клиента",
      "Защита сделки",
      "Подтверждение заказа",
      "Доступный баланс",
      "Вывод средств",
    ],
  };
}
