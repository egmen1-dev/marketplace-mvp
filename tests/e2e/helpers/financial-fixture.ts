import { expect, type APIRequestContext } from "@playwright/test";

const E2E_SECRET = () => process.env.E2E_FIXTURE_SECRET?.trim() ?? "";

export type WalletFixtureState = {
  userId: string;
  email: string;
  topupSpendableAmount: number;
  bonusSpendableAmount: number;
  sellerAvailableAmount: number;
  sellerReservedAmount: number;
  ledgerEntryCount?: number;
};

export async function resetWalletFixture(
  request: APIRequestContext,
  email: string,
): Promise<void> {
  const res = await request.delete("/api/e2e/wallet-fixture", {
    headers: { "x-e2e-secret": E2E_SECRET() },
    data: { email },
  });
  expect(res.ok(), `wallet reset failed: ${res.status()}`).toBeTruthy();
}

export async function seedWalletFixture(
  request: APIRequestContext,
  data: {
    email: string;
    topupAmount?: number;
    bonusAmount?: number;
    sellerAvailableAmount?: number;
  },
): Promise<WalletFixtureState> {
  const res = await request.post("/api/e2e/wallet-fixture", {
    headers: { "x-e2e-secret": E2E_SECRET() },
    data,
  });
  expect(res.ok(), `wallet seed failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()) as WalletFixtureState;
}

export async function readWalletFixture(
  request: APIRequestContext,
  email: string,
): Promise<WalletFixtureState> {
  const getRes = await request.get(
    `/api/e2e/wallet-fixture?email=${encodeURIComponent(email)}`,
    { headers: { "x-e2e-secret": E2E_SECRET() } },
  );
  if (getRes.ok()) {
    return (await getRes.json()) as WalletFixtureState;
  }

  // Fallback for staging builds without GET handler — zero-amount POST is read-only.
  const res = await request.post("/api/e2e/wallet-fixture", {
    headers: { "x-e2e-secret": E2E_SECRET() },
    data: { email, topupAmount: 0, bonusAmount: 0 },
  });
  expect(res.ok(), `wallet read failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()) as WalletFixtureState;
}
