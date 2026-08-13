import { Prisma } from "@prisma/client";

/** Default marketplace commission: 10% = 1000 basis points. */
export const MARKETPLACE_COMMISSION_BPS = 1000;

export type CommissionSplit = {
  gross: Prisma.Decimal;
  commission: Prisma.Decimal;
  sellerAmount: Prisma.Decimal;
  commissionBps: number;
};

/**
 * Split gross amount into platform commission + seller net.
 * Uses integer minor units (kopecks) to avoid float drift, then Decimal.
 */
export function splitCommission(
  grossMajor: number | string | Prisma.Decimal,
  commissionBps: number = MARKETPLACE_COMMISSION_BPS,
): CommissionSplit {
  const gross = new Prisma.Decimal(
    typeof grossMajor === "number"
      ? grossMajor.toFixed(2)
      : String(grossMajor),
  );
  const minor = Math.round(gross.mul(100).toNumber());
  const commissionMinor = Math.round((minor * commissionBps) / 10_000);
  const sellerMinor = minor - commissionMinor;
  return {
    gross,
    commission: new Prisma.Decimal(commissionMinor).div(100),
    sellerAmount: new Prisma.Decimal(sellerMinor).div(100),
    commissionBps,
  };
}
