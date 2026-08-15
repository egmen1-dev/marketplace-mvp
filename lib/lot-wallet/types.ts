import type { WalletLedgerType } from "@prisma/client";

export type WalletBuckets = {
  /** Total spendable (withdrawable seller + topup + bonus) */
  spendableAmount: number;
  /** Seller earnings available for payout (excludes topup/bonus) */
  withdrawableAmount: number;
  /** Seller funds awaiting order completion */
  pendingFromSales: number;
  /** Non-withdrawable top-up balance */
  topupAmount: number;
  /** Non-withdrawable bonus balance */
  bonusAmount: number;
  /** Reserved for in-flight payout requests */
  reservedForPayout: number;
  /** Display headline total */
  totalAvailableDisplay: number;
};

export type WalletLedgerItem = {
  id: string;
  type: WalletLedgerType;
  direction: "CREDIT" | "DEBIT";
  amount: number;
  title: string;
  subtitle: string | null;
  createdAt: string;
};

export type WalletOverview = {
  enabled: boolean;
  buckets: WalletBuckets;
  recentEntries: WalletLedgerItem[];
};

export type WalletHistoryFilter =
  | "all"
  | "topups"
  | "purchases"
  | "sales"
  | "promotion"
  | "payouts"
  | "bonuses";

export type WalletTab = "overview" | "topup" | "withdraw" | "history" | "methods";
