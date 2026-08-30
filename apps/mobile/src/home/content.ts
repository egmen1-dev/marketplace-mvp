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
  tag: "Скидки до 50%",
  titleLine1: "Лучшие товары",
  titleLine2: "по лучшим ценам",
  subtitle: "Покупай выгодно каждый день",
  cta: "Смотреть все",
} as const;

export const HOME_TRUST_ITEMS = [
  {
    id: "sellers",
    icon: "shield-check-outline" as const,
    title: "Проверенные продавцы",
    text: "Только честные и надёжные",
  },
  {
    id: "returns",
    icon: "package-variant-closed" as const,
    title: "Возврат 14 дней",
    text: "Если товар не подошёл",
  },
  {
    id: "support",
    icon: "message-text-outline" as const,
    title: "Поддержка 24/7",
    text: "Мы всегда на связи",
  },
] as const;

export const HOME_PROMO_TILES = [
  {
    id: "home",
    title: "Для дома и уюта",
    subtitle: "Скидки до 40%",
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
