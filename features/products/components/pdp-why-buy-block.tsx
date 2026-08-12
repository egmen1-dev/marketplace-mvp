import { ShieldCheck, Store, Truck } from "lucide-react";

import { PdpSectionViewTracker } from "@/features/products/components/pdp-section-view-tracker";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type PdpWhyBuyBlockProps = {
  productId: string;
  sellerVerified: boolean;
  className?: string;
};

/** Conversion strip — only real platform guarantees, no fake social proof. */
export function PdpWhyBuyBlock({
  productId,
  sellerVerified,
  className,
}: PdpWhyBuyBlockProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card/40 p-4 sm:p-5",
        className,
      )}
      data-testid="pdp-why-buy"
    >
      <PdpSectionViewTracker section="why_buy" productId={productId} />
      <h2 className="font-heading text-base font-semibold tracking-tight">
        Почему покупают
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        <li className="flex items-start gap-2 text-sm">
          <Store className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-medium text-foreground">
              {sellerVerified ? "Проверенный продавец" : "Продавец на площадке"}
            </span>
            <span className="mt-0.5 block text-muted-foreground">
              {sellerVerified
                ? "Магазин прошёл проверку"
                : `Профиль продавца на ${APP_NAME}`}
            </span>
          </span>
        </li>
        <li className="flex items-start gap-2 text-sm">
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden
          />
          <span>
            <span className="font-medium text-foreground">Безопасная сделка</span>
            <span className="mt-0.5 block text-muted-foreground">
              Оплата через площадку — данные карты не у продавца
            </span>
          </span>
        </li>
        <li className="flex items-start gap-2 text-sm">
          <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-medium text-foreground">Доставка</span>
            <span className="mt-0.5 block text-muted-foreground">
              СДЭК: ПВЗ и курьер — расчёт при оформлении
            </span>
          </span>
        </li>
      </ul>
    </section>
  );
}
