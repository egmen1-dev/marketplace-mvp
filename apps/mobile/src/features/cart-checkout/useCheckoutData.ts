import * as Linking from "expo-linking";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchCart,
  fetchDeliveryPoints,
  fetchDeliveryQuote,
  fetchProduct,
  fetchWallet,
  postTelemetry,
} from "../../api/endpoints";
import { loadAppConfig } from "../../config/env";
import { useAppStore } from "../../store/app-store";
import {
  EMPTY_CHECKOUT_FORM,
  mergeProductEnrichment,
  parseCartCommerceView,
  type CartCommerceView,
  type CheckoutFieldErrors,
  type CheckoutFormState,
  type CheckoutSummary,
  type DeliveryQuoteView,
  type PickupPointView,
} from "./types";

export type CheckoutAlphaState = {
  visible: boolean;
  webCheckoutUrl: string;
};

export type CheckoutDataState = {
  cart: CartCommerceView | null;
  form: CheckoutFormState;
  fieldErrors: CheckoutFieldErrors;
  quote: DeliveryQuoteView | null;
  quoteLoading: boolean;
  quoteError: string | null;
  points: PickupPointView[];
  pointsLoading: boolean;
  pointsError: string | null;
  walletEnabled: boolean;
  walletSpendable: number;
  summary: CheckoutSummary;
  loading: boolean;
  offlineBlocked: boolean;
  cartError: string | null;
  submitting: boolean;
  submitSuccess: boolean;
  alphaState: CheckoutAlphaState | null;
  startedAt: number;
  setContact: (patch: Partial<CheckoutFormState["contact"]>) => void;
  setRecipient: (patch: Partial<CheckoutFormState["recipient"]>) => void;
  setDelivery: (patch: Partial<CheckoutFormState["delivery"]>) => void;
  setPaymentMethod: (method: CheckoutFormState["paymentMethod"]) => void;
  setComment: (comment: string) => void;
  retryQuote: () => Promise<void>;
  retryPoints: () => Promise<void>;
  refresh: () => Promise<void>;
  submit: () => Promise<void>;
  openWebCheckout: () => void;
};

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function validateForm(form: CheckoutFormState, walletEnabled: boolean, walletSpendable: number, orderTotal: number): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  const phoneDigits = normalizePhone(form.contact.phone);
  if (phoneDigits.length < 10) {
    errors.phone = "Укажите корректный номер телефона";
  }
  if (form.contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact.email.trim())) {
    errors.email = "Некорректный email";
  }
  if (form.recipient.fullName.trim().length < 2) {
    errors.fullName = "Укажите ФИО получателя";
  }
  if (form.delivery.city.trim().length < 2) {
    errors.city = "Укажите город доставки";
  }
  if (form.delivery.method === "PICKUP" && !form.delivery.pickupPointCode) {
    errors.pickupPointCode = "Выберите пункт выдачи";
  }
  if (form.paymentMethod === "wallet" && walletEnabled && walletSpendable < orderTotal) {
    errors.payment = "Недостаточно средств в кошельке";
  }
  return errors;
}

export function useCheckoutData(): CheckoutDataState {
  const offline = useAppStore((s) => s.offline);
  const [cart, setCart] = useState<CartCommerceView | null>(null);
  const [form, setForm] = useState<CheckoutFormState>(EMPTY_CHECKOUT_FORM);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [quote, setQuote] = useState<DeliveryQuoteView | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [points, setPoints] = useState<PickupPointView[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [walletEnabled, setWalletEnabled] = useState(false);
  const [walletSpendable, setWalletSpendable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offlineBlocked, setOfflineBlocked] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [alphaState, setAlphaState] = useState<CheckoutAlphaState | null>(null);
  const startedAtRef = useRef(Date.now());
  const startedTelemetryRef = useRef(false);

  const deliveryCost = quote?.cost ?? 0;
  const goodsTotal = cart?.subtotal ?? 0;
  const discountTotal = cart?.savings ?? 0;
  const orderTotal = goodsTotal + deliveryCost;
  const summary: CheckoutSummary = {
    goodsTotal,
    deliveryCost,
    discountTotal,
    orderTotal,
    currency: cart?.currency ?? "RUB",
  };

  const loadPoints = useCallback(async (city: string) => {
    if (city.trim().length < 2) {
      setPoints([]);
      return;
    }
    setPointsLoading(true);
    setPointsError(null);
    try {
      const res = await fetchDeliveryPoints(city.trim());
      const mapped = (res.points ?? []).map((point) => ({
        code: point.code,
        name: point.name,
        address: point.address,
        city: point.city,
        workTime: point.workTime,
      }));
      setPoints(mapped);
      if (mapped.length > 0 && !form.delivery.pickupPointCode) {
        setForm((prev) => ({ ...prev, delivery: { ...prev.delivery, pickupPointCode: mapped[0]!.code } }));
      }
    } catch (err) {
      setPoints([]);
      setPointsError(err instanceof Error ? err.message : "Не удалось загрузить пункты выдачи");
      void postTelemetry({ screen: "checkout", event: "checkout_error", errorCode: "points_failed" });
    } finally {
      setPointsLoading(false);
    }
  }, [form.delivery.pickupPointCode]);

  const loadQuote = useCallback(async () => {
    if (!cart || cart.items.length === 0) return;
    const city = form.delivery.city.trim();
    if (city.length < 2) return;

    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const weightGrams = cart.items.reduce((sum, line) => sum + line.quantity * 500, 0);
      const res = await fetchDeliveryQuote({
        method: form.delivery.method,
        city,
        pickupPointCode: form.delivery.method === "PICKUP" ? form.delivery.pickupPointCode || undefined : undefined,
        weightGrams: Math.max(weightGrams, 500),
      });
      setQuote({
        cost: res.quote.cost,
        currency: res.quote.currency,
        etaLabel: res.etaLabel,
        source: res.source,
      });
    } catch (err) {
      setQuote(null);
      setQuoteError(err instanceof Error ? err.message : "Не удалось рассчитать доставку");
      void postTelemetry({ screen: "checkout", event: "checkout_error", errorCode: "quote_failed" });
    } finally {
      setQuoteLoading(false);
    }
  }, [cart, form.delivery.city, form.delivery.method, form.delivery.pickupPointCode]);

  const loadCheckout = useCallback(async () => {
    if (offline) {
      setOfflineBlocked(true);
      setCart(null);
      setLoading(false);
      return;
    }

    setOfflineBlocked(false);
    setLoading(true);
    setCartError(null);

    try {
      const [rawCart, wallet] = await Promise.all([fetchCart(), fetchWallet().catch(() => null)]);
      let parsed = parseCartCommerceView(rawCart as unknown as Record<string, unknown>);
      const enriched = await Promise.all(
        parsed.items.map(async (line) => {
          try {
            const productRaw = await fetchProduct(line.productId);
            return mergeProductEnrichment(line, productRaw);
          } catch {
            return line;
          }
        }),
      );
      parsed = { ...parsed, items: enriched };
      setCart(parsed);
      setWalletEnabled(Boolean(wallet?.enabled));
      setWalletSpendable(Number(wallet?.spendable ?? 0));

      if (!startedTelemetryRef.current) {
        startedTelemetryRef.current = true;
        void postTelemetry({ screen: "checkout", event: "checkout_started" });
      }
    } catch (err) {
      setCartError(err instanceof Error ? err.message : "Не удалось загрузить корзину");
      void postTelemetry({ screen: "checkout", event: "checkout_error", errorCode: "cart_load_failed" });
    } finally {
      setLoading(false);
    }
  }, [offline]);

  useEffect(() => {
    void loadCheckout();
  }, [loadCheckout]);

  useEffect(() => {
    if (form.delivery.method === "PICKUP") {
      void loadPoints(form.delivery.city);
    }
  }, [form.delivery.city, form.delivery.method, loadPoints]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  useEffect(() => {
    return () => {
      const elapsedMs = Date.now() - startedAtRef.current;
      if (elapsedMs > 3000 && !submitSuccess) {
        void postTelemetry({
          screen: "checkout",
          event: "checkout_abandoned",
          errorCode: String(Math.round(elapsedMs / 1000)),
        });
      }
    };
  }, [submitSuccess]);

  const submit = useCallback(async () => {
    if (!cart || cart.items.length === 0) return;
    const errors = validateForm(form, walletEnabled, walletSpendable, orderTotal);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      void postTelemetry({ screen: "checkout", event: "checkout_error", errorCode: "validation_failed" });
      return;
    }

    setSubmitting(true);
    void postTelemetry({ screen: "checkout", event: "checkout_submitted" });

    await new Promise((resolve) => setTimeout(resolve, 450));

    const config = loadAppConfig();
    const webCheckoutUrl = `${config.apiBaseUrl}/checkout`;

    setSubmitting(false);
    setSubmitSuccess(true);
    setAlphaState({ visible: true, webCheckoutUrl });
    void postTelemetry({ screen: "checkout", event: "checkout_alpha_redirect" });
  }, [cart, form, orderTotal, walletEnabled, walletSpendable]);

  const openWebCheckout = useCallback(() => {
    if (!alphaState?.webCheckoutUrl) return;
    void Linking.openURL(alphaState.webCheckoutUrl);
    void postTelemetry({ screen: "checkout", event: "checkout_web_opened" });
  }, [alphaState?.webCheckoutUrl]);

  return {
    cart,
    form,
    fieldErrors,
    quote,
    quoteLoading,
    quoteError,
    points,
    pointsLoading,
    pointsError,
    walletEnabled,
    walletSpendable,
    summary,
    loading,
    offlineBlocked,
    cartError,
    submitting,
    submitSuccess,
    alphaState,
    startedAt: startedAtRef.current,
    setContact: (patch) => setForm((prev) => ({ ...prev, contact: { ...prev.contact, ...patch } })),
    setRecipient: (patch) => setForm((prev) => ({ ...prev, recipient: { ...prev.recipient, ...patch } })),
    setDelivery: (patch) => setForm((prev) => ({ ...prev, delivery: { ...prev.delivery, ...patch } })),
    setPaymentMethod: (method) => setForm((prev) => ({ ...prev, paymentMethod: method })),
    setComment: (comment) => setForm((prev) => ({ ...prev, comment })),
    retryQuote: loadQuote,
    retryPoints: async () => loadPoints(form.delivery.city),
    refresh: loadCheckout,
    submit,
    openWebCheckout,
  };
}
