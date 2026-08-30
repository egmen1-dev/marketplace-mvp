export const HOME_LOCATION_LABEL = "Екатеринбург";

export const HOME_CATEGORY_SHORTCUTS = [
  { id: "all", label: "Все", icon: "view-grid-outline" as const, activeIcon: "view-grid" as const },
  { id: "electronics", label: "Электроника", icon: "cellphone" as const, activeIcon: "cellphone" as const },
  { id: "home", label: "Дом и сад", icon: "pine-tree" as const, activeIcon: "pine-tree" as const },
  { id: "clothing", label: "Одежда", icon: "tshirt-crew-outline" as const, activeIcon: "tshirt-crew-outline" as const },
  { id: "transport", label: "Транспорт", icon: "car-outline" as const, activeIcon: "car-outline" as const },
  { id: "more", label: "Ещё", icon: "dots-horizontal" as const, activeIcon: "dots-horizontal" as const },
] as const;

export const HOME_HERO = {
  tag: "Маркетплейс LOT",
  titleLine1: "Товары от продавцов",
  titleLine2: "в одном приложении",
  subtitle: "Ищите, сравнивайте и покупайте",
  cta: "Смотреть все",
} as const;

export const HOME_TRUST_ITEMS = [
  {
    id: "chat",
    icon: "message-text-outline" as const,
    title: "Чат с продавцом",
    text: "Задайте вопрос перед покупкой",
  },
  {
    id: "orders",
    icon: "package-variant-closed" as const,
    title: "Статус заказа",
    text: "Следите за покупкой в приложении",
  },
  {
    id: "moderation",
    icon: "shield-check-outline" as const,
    title: "Проверка ЛОТов",
    text: "Публикация после модерации",
  },
] as const;

export const HOME_PROMO_TILES = [
  {
    id: "home",
    title: "Для дома и уюта",
    subtitle: "Подборка для дома",
    background: "#FFF4EB",
    accent: "#FFE2CC",
    icon: "sofa-outline" as const,
  },
  {
    id: "transport",
    title: "Транспорт",
    subtitle: "Всё для твоего движения",
    background: "#EEF4FA",
    accent: "#DCE8F5",
    icon: "bike" as const,
  },
  {
    id: "electronics",
    title: "Электроника",
    subtitle: "Техника по выгодным ценам",
    background: "#FFF4EB",
    accent: "#FFE2CC",
    icon: "gamepad-variant-outline" as const,
  },
] as const;
