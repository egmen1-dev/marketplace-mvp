"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  Loader2,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/components/cart-provider";
import {
  WriteSellerButton,
  WriteSellerSignInLink,
} from "@/features/chat";
import { startConversationAction } from "@/features/chat/actions";
import { FavoriteToggleButton } from "@/features/favorites/components/favorite-toggle-button";
import { formatPrice } from "@/features/products/mappers";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackCtaClick, trackEvent } from "@/lib/analytics/client";
import { wasTrustViewedOnClient } from "@/lib/marketplace-trust-conversion/attribution-client";
import { trackTrustPurchaseAfterViewClient } from "@/features/marketplace-trust-conversion/components/trust-conversion-trackers";
import { ROUTES } from "@/lib/constants";
import { TOAST, toastError } from "@/lib/toasts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ProductPurchasePanelProps = {
  productId: string;
  stock: number;
  price: number;
  currency?: string;
  className?: string;
  /** Hide «Написать продавцу» for own listings */
  isOwnProduct?: boolean;
  /** Whether viewer is signed in (guest → sign-in link) */
  isAuthenticated?: boolean;
  /** Show «Забронировать» → cart + checkout seller pickup */
  reservationAvailable?: boolean;
  prepaymentPercent?: number;
  /** Debug / E2E: why CTA is hidden (from getReservationAvailability) */
  reservationReason?: string;
};

export function ProductPurchasePanel({
  productId,
  stock,
  price,
  currency = "RUB",
  className,
  isOwnProduct = false,
  isAuthenticated = false,
  reservationAvailable = false,
  prepaymentPercent = 0,
  reservationReason,
}: ProductPurchasePanelProps) {
  const router = useRouter();
  const { addItem, isPending } = useCart();
  const [qty, setQty] = useState(1);
  const [action, setAction] = useState<"idle" | "add" | "buy">("idle");
  const [status, setStatus] = useState<"idle" | "added">("idle");
  const [stickyVisible, setStickyVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const outOfStock = stock <= 0;
  const maxQty = Math.max(1, stock);
  const busy = isPending || action !== "idle";
  const [writePending, startWrite] = useTransition();
  const autoWriteStarted = useRef(false);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      },
      { rootMargin: "-48px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Guest → sign-in → return with ?writeSeller=1 continues the action
  useEffect(() => {
    if (!isAuthenticated || isOwnProduct || autoWriteStarted.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("writeSeller") !== "1") return;
    autoWriteStarted.current = true;
    startWrite(async () => {
      const res = await startConversationAction(productId);
      if (res && !res.ok) toastError(res.error);
    });
  }, [isAuthenticated, isOwnProduct, productId]);

  const autoReserveStarted = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || isOwnProduct || !reservationAvailable) return;
    if (autoReserveStarted.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("reserve") !== "1") return;
    autoReserveStarted.current = true;
    void handleReserve();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot continue after login
  }, [isAuthenticated, isOwnProduct, reservationAvailable, productId]);

  function clamp(n: number) {
    return Math.min(maxQty, Math.max(1, n));
  }

  function trackTrustCartConversion() {
    if (wasTrustViewedOnClient(productId)) {
      trackTrustPurchaseAfterViewClient(productId);
    }
  }

  async function handleAdd() {
    if (outOfStock || busy) return;
    setAction("add");
    try {
      const result = await addItem(productId, qty);
      if (result.ok) {
        setStatus("added");
        trackEvent({
          event: ANALYTICS_EVENTS.ADD_TO_CART,
          route: `${ROUTES.PRODUCT}/${productId}`,
          entityId: productId,
        });
        trackCtaClick("add_to_cart", {
          route: `${ROUTES.PRODUCT}/${productId}`,
        });
        trackTrustCartConversion();
        toast.success(TOAST.CART_ADDED);
        window.setTimeout(() => setStatus("idle"), 1800);
      } else {
        toastError(result.error);
      }
    } catch {
      toastError();
    } finally {
      setAction("idle");
    }
  }

  async function handleBuy() {
    if (outOfStock || busy) return;
    setAction("buy");
    try {
      const result = await addItem(productId, qty);
      if (result.ok) {
        trackEvent({
          event: ANALYTICS_EVENTS.ADD_TO_CART,
          route: `${ROUTES.PRODUCT}/${productId}`,
          entityId: productId,
        });
        trackEvent({
          event: ANALYTICS_EVENTS.BUY_INTENT,
          route: `${ROUTES.PRODUCT}/${productId}`,
          entityId: productId,
        });
        trackCtaClick("buy", { route: `${ROUTES.PRODUCT}/${productId}` });
        trackTrustCartConversion();
        toast.success(TOAST.CHECKOUT_REDIRECT);
        window.location.assign(ROUTES.CHECKOUT);
      } else {
        toastError(result.error);
      }
    } catch {
      toastError();
    } finally {
      setAction("idle");
    }
  }

  async function handleReserve() {
    if (outOfStock || busy || isOwnProduct) return;
    if (!isAuthenticated) {
      router.push(
        `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(`${ROUTES.PRODUCT}/${productId}?reserve=1`)}`,
      );
      return;
    }
    setAction("buy");
    try {
      const result = await addItem(productId, qty);
      if (result.ok) {
        trackEvent({
          event: ANALYTICS_EVENTS.ADD_TO_CART,
          route: `${ROUTES.PRODUCT}/${productId}`,
          entityId: productId,
        });
        trackEvent({
          event: ANALYTICS_EVENTS.BUY_INTENT,
          route: `${ROUTES.PRODUCT}/${productId}`,
          entityId: productId,
        });
        trackCtaClick("reserve", { route: `${ROUTES.PRODUCT}/${productId}` });
        toast.success("Переходим к бронированию");
        // Full navigation avoids soft-nav races where checkout RSC and
        // client cart/theme trees can diverge during hydrate (#418).
        window.location.assign(`${ROUTES.CHECKOUT}?fulfillment=SELLER_PICKUP`);
      } else {
        toastError(result.error);
      }
    } catch {
      toastError();
    } finally {
      setAction("idle");
    }
  }

  return (
    <>
      <div
        ref={panelRef}
        className={cn("flex flex-col gap-4", className)}
        data-testid="pdp-purchase"
        data-reservation-available={reservationAvailable ? "1" : "0"}
        data-reservation-reason={reservationReason ?? ""}
        data-own-product={isOwnProduct ? "1" : "0"}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">
              Количество
            </span>
            <div className="flex items-center rounded-xl bg-surface-elevated ring-1 ring-border">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-xl"
                disabled={outOfStock || qty <= 1 || busy}
                onClick={() => setQty((q) => clamp(q - 1))}
                aria-label="Уменьшить"
              >
                <Minus />
              </Button>
              <span className="min-w-10 text-center font-heading text-base font-medium tabular-nums">
                {qty}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-xl"
                disabled={outOfStock || qty >= maxQty || busy}
                onClick={() => setQty((q) => clamp(q + 1))}
                aria-label="Увеличить"
              >
                <Plus />
              </Button>
            </div>
          </div>

          {outOfStock ? (
            <p className="text-sm text-destructive">Нет в наличии</p>
          ) : (
            <p className="self-end pb-2 text-sm text-muted-foreground">
              В наличии: {stock} шт.
            </p>
          )}

          <div className="ml-auto self-end pb-1">
            <FavoriteToggleButton
              productId={productId}
              className="size-10 rounded-xl bg-surface-elevated shadow-none ring-1 ring-border"
            />
          </div>
        </div>

        {!isOwnProduct ? (
          isAuthenticated ? (
            <WriteSellerButton productId={productId} className="w-full" />
          ) : (
            <WriteSellerSignInLink productId={productId} className="w-full" />
          )
        ) : (
          <p
            className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
            data-testid="pdp-own-product"
          >
            Это ваш товар — чат с собой недоступен.
          </p>
        )}

        <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
          {reservationAvailable && !isOwnProduct ? (
            <Button
              type="button"
              size="cta"
              className="flex-1"
              disabled={outOfStock || busy}
              aria-busy={action === "buy"}
              data-testid="pdp-reserve"
              onClick={() => void handleReserve()}
            >
              {action === "buy" ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Бронируем…
                </>
              ) : (
                <>
                  <Package data-icon="inline-start" />
                  Забронировать
                  {prepaymentPercent > 0 ? ` · ${prepaymentPercent}%` : ""}
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="cta"
              className="flex-1"
              disabled={outOfStock || busy}
              aria-busy={action === "buy"}
              data-testid="pdp-buy"
              onClick={() => void handleBuy()}
            >
              {action === "buy" ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Добавляем…
                </>
              ) : (
                <>
                  <Zap data-icon="inline-start" />
                  Купить
                </>
              )}
            </Button>
          )}
          <Button
            type="button"
            size="cta"
            variant="secondary"
            className="flex-1"
            disabled={outOfStock || busy}
            aria-busy={action === "add"}
            data-testid="pdp-add-cart"
            onClick={() => void handleAdd()}
          >
            {action === "add" ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Добавляем…
              </>
            ) : status === "added" ? (
              <>
                <Check data-icon="inline-start" />
                Добавлено
              </>
            ) : (
              <>
                <ShoppingBag data-icon="inline-start" />
                В корзину
              </>
            )}
          </Button>
        </div>
        {reservationAvailable && !isOwnProduct ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto w-fit px-0"
            disabled={outOfStock || busy}
            data-testid="pdp-buy"
            onClick={() => void handleBuy()}
          >
            Купить с доставкой
          </Button>
        ) : null}

        <Button
          variant="link"
          size="sm"
          className="h-auto w-fit px-0 text-muted-foreground"
          nativeButton={false}
          render={<Link href="#similar" />}
        >
          Смотреть похожие товары
        </Button>
      </div>

      {/* Mobile sticky purchase — only when main panel is off-screen */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-200 md:hidden",
          stickyVisible && !outOfStock
            ? "translate-y-0"
            : "pointer-events-none translate-y-full",
        )}
        data-testid="pdp-sticky-purchase"
        aria-hidden={!stickyVisible || outOfStock}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-heading text-lg font-semibold text-primary">
            {formatPrice(price, currency)}
          </p>
          {!isOwnProduct ? (
            isAuthenticated ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="size-11 shrink-0"
                aria-label="Написать продавцу"
                title="Написать продавцу"
                data-testid="pdp-sticky-write-seller"
                disabled={writePending}
                onClick={() =>
                  startWrite(async () => {
                    const res = await startConversationAction(productId);
                    if (res && !res.ok) toastError(res.error);
                  })
                }
              >
                <MessageCircle className="size-5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="size-11 shrink-0"
                aria-label="Написать продавцу"
                title="Написать продавцу"
                nativeButton={false}
                render={
                  <Link
                    href={`${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(`${ROUTES.PRODUCT}/${productId}?writeSeller=1`)}`}
                    data-testid="pdp-sticky-write-seller"
                  />
                }
              >
                <MessageCircle className="size-5" />
              </Button>
            )
          ) : null}
          <Button
            type="button"
            size="cta"
            variant="secondary"
            className="min-w-[6.5rem] shrink-0"
            disabled={busy}
            onClick={() => {
              trackCtaClick("sticky_add_to_cart", {
                route: `${ROUTES.PRODUCT}/${productId}`,
              });
              void handleAdd();
            }}
          >
            {status === "added" ? "Добавлено" : "В корзину"}
          </Button>
          <Button
            type="button"
            size="cta"
            className="min-w-[5.5rem] shrink-0"
            disabled={busy}
            data-testid="pdp-sticky-buy"
            onClick={() => {
              trackCtaClick("sticky_buy", {
                route: `${ROUTES.PRODUCT}/${productId}`,
              });
              void handleBuy();
            }}
          >
            Купить
          </Button>
        </div>
      </div>
    </>
  );
}
