/** Unified Russian toast copy for marketplace UX. */

import { toast } from "sonner";

export const TOAST = {
  CART_ADDED: "Товар добавлен в корзину",
  CART_REMOVED: "Товар удален",
  FAVORITE_ADDED: "Добавлено в избранное",
  FAVORITE_REMOVED: "Товар удален",
  SETTINGS_SAVED: "Настройки сохранены",
  ERROR: "Ошибка",
  COMING_SOON: "Функция находится в разработке",
  CHECKOUT_REDIRECT: "Переходим к оформлению",
  FAVORITE_AUTH: "Войдите, чтобы сохранить в избранное",
} as const;

export function toastComingSoon() {
  toast.message(TOAST.COMING_SOON);
}

export function toastError(message?: string | null) {
  toast.error(message?.trim() || TOAST.ERROR);
}
