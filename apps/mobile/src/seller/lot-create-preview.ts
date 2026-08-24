import type { SellerPickupPoint } from "../api/seller-lot";
import { LOT_CONDITION_OPTIONS } from "./lot-create-constants";

export function conditionPreviewLabel(condition: "NEW" | "USED" | "REFURBISHED"): string {
  const label = LOT_CONDITION_OPTIONS.find((opt) => opt.id === condition)?.label ?? "Б/у";
  return `Состояние: ${label}`;
}

export function pickupPointsLabel(count: number): string {
  if (count === 1) return "1 точка доступна";
  if (count >= 2 && count <= 4) return `${count} точки доступны`;
  return `${count} точек доступно`;
}

export function formatPickupPreview(
  points: SellerPickupPoint[],
  selectedIds: string[],
): { title: string; detail: string | null } {
  if (selectedIds.length === 0) {
    return { title: "Самовывоз", detail: null };
  }

  const selected = points.filter((point) => selectedIds.includes(point.id));
  if (selected.length === 1) {
    const point = selected[0];
    return {
      title: "Самовывоз",
      detail: `${point.name} · ${point.city}, ${point.address}`,
    };
  }

  const count = selected.length > 0 ? selected.length : selectedIds.length;
  return {
    title: "Самовывоз",
    detail: pickupPointsLabel(count),
  };
}
