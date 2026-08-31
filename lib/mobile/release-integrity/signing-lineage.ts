/** Closed Beta signing lineage — must match unless an approved migration exists. */

export const LOT_CLOSED_BETA_SIGNER_SHA256 =
  "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c";

export function verifySigningLineage(signerSha256: string | null): {
  ok: boolean;
  expected: string;
  actual: string | null;
} {
  const actual = signerSha256?.toLowerCase() ?? null;
  return {
    ok: actual === LOT_CLOSED_BETA_SIGNER_SHA256,
    expected: LOT_CLOSED_BETA_SIGNER_SHA256,
    actual,
  };
}
