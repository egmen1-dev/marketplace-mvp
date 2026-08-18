import type { Money } from "../value-objects/money";
import type { AppMode } from "./session";

export type WalletBalance = {
  readonly spendable: Money;
  readonly withdrawable: Money;
  readonly pending: Money;
  readonly enabled: boolean;
  readonly mode: AppMode;
};
