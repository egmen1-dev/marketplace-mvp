import { useCallback, useEffect, useState } from "react";

import { domainErrorMessage } from "../../domain/errors/error-factory";
import { getCommerceUseCases } from "../../domain/services/commerce-container";
import { useAppStore } from "../../store/app-store";
import { walletBalanceToView } from "./wallet-view";

export type WalletRecentSale = {
  id: string;
  orderNumber: string;
  status: string;
};

export type WalletDataState = {
  isSeller: boolean;
  loading: boolean;
  data: ReturnType<typeof walletBalanceToView> | null;
  recentSales: WalletRecentSale[];
  refreshSales: () => Promise<void>;
};

export function useWalletData(): WalletDataState {
  const commerce = getCommerceUseCases();
  const mode = useAppStore((s) => s.mode);
  const isSeller = mode === "seller";

  const [data, setData] = useState<ReturnType<typeof walletBalanceToView> | null>(null);
  const [recentSales, setRecentSales] = useState<WalletRecentSale[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSales = useCallback(async () => {
    if (!isSeller) {
      setRecentSales([]);
      return;
    }
    const result = await commerce.loadSellerOrders.execute({});
    if (!result.ok) {
      setRecentSales([]);
      return;
    }
    setRecentSales(
      result.value.items.slice(0, 3).map((item) => ({
        id: item.id,
        orderNumber: item.orderNumber,
        status: item.status,
      })),
    );
  }, [commerce.loadSellerOrders, isSeller]);

  const load = useCallback(async () => {
    setLoading(true);
    const walletResult = await commerce.loadWallet.execute({});
    if (walletResult.ok) {
      setData(walletBalanceToView(walletResult.value));
    } else {
      setData(null);
    }
    await loadSales();
    setLoading(false);
  }, [commerce.loadWallet, loadSales]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return commerce.events.subscribe("WalletChanged", (event) => {
      setData(walletBalanceToView(event.balance));
    });
  }, [commerce.events]);

  useEffect(() => {
    return commerce.events.subscribe("SellerOrderChanged", () => {
      void loadSales();
    });
  }, [commerce.events, loadSales]);

  return {
    isSeller,
    loading,
    data,
    recentSales,
    refreshSales: loadSales,
  };
}
