/** Unified LOT Wallet — buyer + seller money in one user account. */
export function isLotWalletEnabled(): boolean {
  return process.env.LOT_WALLET_ENABLED !== "false";
}
