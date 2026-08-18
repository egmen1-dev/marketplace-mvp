import type { WalletBalance } from "../../domain/contracts/entities/wallet";
import { money } from "../../domain/contracts/value-objects/money";

export type WalletDto = {
  spendable: number;
  withdrawable: number;
  pending: number;
  enabled: boolean;
};

export function mapWalletDto(dto: WalletDto): WalletBalance {
  return {
    spendable: money(dto.spendable, "RUB"),
    withdrawable: money(dto.withdrawable, "RUB"),
    pending: money(dto.pending, "RUB"),
    enabled: dto.enabled,
    mode: "buyer",
  };
}

export function walletBalanceToView(balance: WalletBalance) {
  return {
    spendable: balance.spendable.amount,
    withdrawable: balance.withdrawable.amount,
    pending: balance.pending.amount,
    enabled: balance.enabled,
  };
}
