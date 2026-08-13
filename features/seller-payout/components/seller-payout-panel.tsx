"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/features/products/mappers";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import {
  addPaymentMethodAction,
  createPayoutRequestAction,
  trackPayoutPageViewAction,
  trackPayoutRequestStartedAction,
} from "@/lib/seller-payout/actions";
import {
  MIN_PAYOUT_AMOUNT,
  paymentMethodTypeLabel,
} from "@/lib/seller-payout/types";
import type {
  PayoutRequestDto,
  SellerPaymentMethodDto,
  SellerPayoutDashboard,
} from "@/lib/seller-payout/types";

type SellerPayoutPanelProps = {
  data: SellerPayoutDashboard;
};

type Step = "amount" | "method" | "confirm" | "success";

export function SellerPayoutPanel({ data }: SellerPayoutPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState<string | null>(
    data.methods[0]?.id ?? null,
  );
  const [createdRequest, setCreatedRequest] = useState<PayoutRequestDto | null>(
    null,
  );
  const [newMethodType, setNewMethodType] = useState<"CARD" | "BANK_ACCOUNT">(
    "CARD",
  );
  const [newMethodRef, setNewMethodRef] = useState("");
  const [showAddMethod, setShowAddMethod] = useState(data.methods.length === 0);

  useEffect(() => {
    if (!data.enabled) return;
    void trackPayoutPageViewAction();
    trackEvent({
      event: ANALYTICS_EVENTS.PAYOUT_PAGE_VIEW,
      route: ROUTES.ACCOUNT_PAYOUTS,
    });
  }, [data.enabled]);

  if (!data.enabled) {
    return (
      <Card data-testid="seller-payout-panel">
        <CardHeader>
          <CardTitle>Вывод средств</CardTitle>
          <CardDescription>SELLER_PAYOUT_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const parsedAmount = Number(amount.replace(/\s/g, "").replace(",", "."));
  const selectedMethod = data.methods.find((m) => m.id === methodId) ?? null;

  function startWithdrawal() {
    void trackPayoutRequestStartedAction();
    trackEvent({
      event: ANALYTICS_EVENTS.PAYOUT_REQUEST_STARTED,
      route: ROUTES.ACCOUNT_PAYOUTS,
    });
    setStep("amount");
  }

  function submitAmount() {
    if (parsedAmount < MIN_PAYOUT_AMOUNT) {
      window.alert(`Минимальная сумма вывода — ${MIN_PAYOUT_AMOUNT} ₽`);
      return;
    }
    if (parsedAmount > data.balance.availableAmount) {
      window.alert("Сумма превышает доступный баланс");
      return;
    }
    setStep("method");
  }

  function addMethod() {
    startTransition(async () => {
      const result = await addPaymentMethodAction({
        type: newMethodType,
        detailsReference: newMethodRef,
      });
      if (!result.ok) {
        window.alert(result.error ?? "Ошибка");
        return;
      }
      setShowAddMethod(false);
      setNewMethodRef("");
      if (result.methodId) setMethodId(result.methodId);
      router.refresh();
    });
  }

  function submitRequest() {
    if (!methodId) {
      window.alert("Выберите способ получения");
      return;
    }
    startTransition(async () => {
      const result = await createPayoutRequestAction({
        amount: parsedAmount,
        paymentMethodId: methodId,
      });
      if (!result.ok) {
        window.alert(result.error ?? "Ошибка");
        return;
      }
      const match = data.history.find((r) => r.id === result.requestId);
      setCreatedRequest(
        match ?? {
          id: result.requestId ?? "",
          displayNumber: (result.requestId ?? "").slice(-5).toUpperCase(),
          sellerId: "",
          amount: parsedAmount,
          status: "UNDER_REVIEW",
          statusLabel: "На проверке",
          paymentMethodId: methodId,
          paymentMethodLabel: selectedMethod?.label ?? "",
          paymentMethodReference: selectedMethod?.detailsReference ?? "",
          requestedAt: new Date().toISOString(),
          approvedAt: null,
          processingAt: null,
          completedAt: null,
          rejectedAt: null,
          adminNote: null,
        },
      );
      setStep("success");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="seller-payout-panel">
      <div className="flex flex-wrap items-center gap-3">
      <Link
        href={ROUTES.ACCOUNT_BALANCE}
        className="inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted"
      >
        <ArrowLeft className="size-4" />
        Баланс
      </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-5" />
            Вывод средств
          </CardTitle>
          <CardDescription>
            Доступно: {formatPrice(data.balance.availableAmount)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === "amount" && (
            <div className="flex flex-col gap-4" data-testid="payout-step-amount">
              <div>
                <Label htmlFor="payout-amount">Введите сумму</Label>
                <Input
                  id="payout-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="20 000"
                  className="mt-2"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Минимальная сумма вывода: {formatPrice(MIN_PAYOUT_AMOUNT)}
                </p>
              </div>
              <Button onClick={submitAmount} disabled={!amount.trim()}>
                Продолжить
              </Button>
            </div>
          )}

          {step === "method" && (
            <div className="flex flex-col gap-4" data-testid="payout-step-method">
              <p className="text-sm font-medium">Получить деньги:</p>
              <div className="flex flex-col gap-2">
                {data.methods.map((method: SellerPaymentMethodDto) => (
                  <button
                    key={method.id}
                    type="button"
                    data-testid={`payout-method-${method.id}`}
                    className={`rounded-xl border p-3 text-left ${
                      methodId === method.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => setMethodId(method.id)}
                  >
                    <p className="font-medium">{method.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {paymentMethodTypeLabel(method.type)} · {method.detailsReference}
                    </p>
                  </button>
                ))}
              </div>
              {showAddMethod ? (
                <div className="rounded-xl border border-dashed p-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newMethodType === "CARD" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewMethodType("CARD")}
                    >
                      Карта
                    </Button>
                    <Button
                      type="button"
                      variant={
                        newMethodType === "BANK_ACCOUNT" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setNewMethodType("BANK_ACCOUNT")}
                    >
                      Счёт
                    </Button>
                  </div>
                  <Input
                    className="mt-3"
                    placeholder="Последние цифры карты или счёта"
                    value={newMethodRef}
                    onChange={(e) => setNewMethodRef(e.target.value)}
                  />
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={addMethod}
                    disabled={pending || !newMethodRef.trim()}
                  >
                    {pending ? <Loader2 className="size-4 animate-spin" /> : "Сохранить"}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowAddMethod(true)}>
                  Добавить способ
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("amount")}>
                  Назад
                </Button>
                <Button onClick={() => setStep("confirm")} disabled={!methodId}>
                  Продолжить
                </Button>
              </div>
            </div>
          )}

          {step === "confirm" && selectedMethod && (
            <div className="flex flex-col gap-4" data-testid="payout-step-confirm">
              <p className="text-sm font-medium">Подтвердите вывод:</p>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Сумма</dt>
                  <dd className="font-medium tabular-nums">
                    {formatPrice(parsedAmount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Получатель</dt>
                  <dd>{selectedMethod.detailsReference}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Комиссия</dt>
                  <dd>{formatPrice(0)}</dd>
                </div>
              </dl>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("method")}>
                  Назад
                </Button>
                <Button
                  data-testid="payout-submit-request"
                  onClick={submitRequest}
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Создать заявку"
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "success" && createdRequest && (
            <div className="flex flex-col gap-3" data-testid="payout-step-success">
              <p className="font-heading text-lg font-semibold">Заявка создана</p>
              <p className="text-sm">
                Номер: <strong>#{createdRequest.displayNumber}</strong>
              </p>
              <p className="text-sm">
                Сумма: {formatPrice(createdRequest.amount)}
              </p>
              <Badge variant="secondary">На проверке</Badge>
              <p className="text-sm text-muted-foreground">
                Мы проверим заявку и подготовим выплату.
              </p>
              <Button variant="outline" onClick={() => setStep("amount")}>
                Новый вывод
              </Button>
            </div>
          )}

          {step === "amount" && data.balance.availableAmount >= MIN_PAYOUT_AMOUNT && (
            <Button variant="secondary" onClick={startWithdrawal} className="sr-only">
              Вывести
            </Button>
          )}
        </CardContent>
      </Card>

      <PayoutHistoryList history={data.history} />
    </div>
  );
}

function PayoutHistoryList({ history }: { history: PayoutRequestDto[] }) {
  if (history.length === 0) return null;

  return (
    <section data-testid="payout-history">
      <h2 className="font-heading text-lg font-semibold">История выплат</h2>
      <div className="mt-4 flex flex-col gap-3">
        {history.map((item) => (
          <Card key={item.id} data-testid={`payout-history-${item.id}`}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium tabular-nums">{formatPrice(item.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.requestedAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
              <Badge variant={item.status === "COMPLETED" ? "default" : "secondary"}>
                {item.statusLabel}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
