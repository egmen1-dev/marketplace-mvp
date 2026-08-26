import { ModerationStatus, ProductStatus } from "@prisma/client";

/** Canonical seller «Мои ЛОТы» tabs — single source of truth for API + mobile. */
export type SellerLotsTab = "active" | "pending" | "drafts" | "sold";

export const SELLER_LOTS_TABS: Array<{ key: SellerLotsTab; label: string }> = [
  { key: "active", label: "Активные" },
  { key: "pending", label: "На проверке" },
  { key: "drafts", label: "Сохранённые" },
  { key: "sold", label: "Проданные" },
];

export type SellerLotSection = SellerLotsTab | "rejected" | "needs_fix";

export type SellerLotSectionSnapshot = {
  status: ProductStatus | string;
  moderationState?: ModerationStatus | string | null;
};

/** Authoritative section for a seller LOT — used for tab filters, badges, and counters. */
export function resolveSellerLotSection(product: SellerLotSectionSnapshot): SellerLotSection {
  const status = product.status as ProductStatus;
  const moderation = (product.moderationState ?? null) as ModerationStatus | null;

  if (status === ProductStatus.ARCHIVED) return "sold";
  if (status === ProductStatus.ACTIVE) return "active";

  if (moderation === ModerationStatus.NEEDS_FIX) return "needs_fix";
  if (moderation === ModerationStatus.PENDING_REVIEW) return "pending";
  if (moderation === ModerationStatus.REJECTED) return "rejected";

  return "drafts";
}

export function sellerLotSectionLabel(section: SellerLotSection): string {
  switch (section) {
    case "active":
      return "Активный";
    case "pending":
      return "На проверке";
    case "needs_fix":
      return "Нужно исправить";
    case "rejected":
      return "Отклонён";
    case "drafts":
      return "Сохранён";
    case "sold":
      return "Проданные";
    default:
      return "—";
  }
}

export function sellerLotSectionMatchesTab(section: SellerLotSection, tab: SellerLotsTab): boolean {
  if (tab === "active") return section === "active";
  if (tab === "pending") return section === "pending" || section === "needs_fix";
  if (tab === "drafts") return section === "drafts" || section === "rejected";
  if (tab === "sold") return section === "sold";
  return false;
}

export function parseSellerLotsTab(value: string | null | undefined): SellerLotsTab {
  if (value === "drafts" || value === "pending" || value === "sold") return value;
  return "active";
}

export function sellerLotSectionTone(
  section: SellerLotSection,
): "success" | "warning" | "neutral" | "danger" {
  switch (section) {
    case "active":
      return "success";
    case "pending":
    case "needs_fix":
      return "warning";
    case "rejected":
      return "danger";
    default:
      return "neutral";
  }
}
