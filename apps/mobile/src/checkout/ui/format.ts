export { formatCartItemCount } from "../../cart/ui/format";

export function formatCheckoutSubtitle(itemCount: number, totalLabel: string): string {
  const mod10 = itemCount % 10;
  const mod100 = itemCount % 100;
  let noun = "товаров";
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) noun = "товар";
    else if (mod10 >= 2 && mod10 <= 4) noun = "товара";
  }
  return `${itemCount} ${noun} • ${totalLabel}`;
}

export function formatQuantityLabel(quantity: number): string {
  return `${quantity} шт.`;
}
