import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function mustContain(file: string, needle: string, id: string) {
  const source = readFileSync(file, "utf8");
  if (!source.includes(needle)) {
    console.error(`[FAIL] ${id}: expected ${file} to contain ${needle}`);
    process.exit(1);
  }
  console.log(`[PASS] ${id}`);
}

mustContain("apps/mobile/src/seller/use-lot-create-form.ts", "setPublishOutcome", "publish_outcome_state");
mustContain("apps/mobile/app/sell/create.tsx", "pendingReviewTitle", "pending_success_copy");
mustContain("apps/mobile/app/(tabs)/seller-products.tsx", "На проверке", "my_lots_pending_tab");
mustContain("lib/mobile/seller-product-publish.ts", "resolveLotPublishOutcome", "publish_outcome_mapper");
mustContain("app/api/products/[id]/route.ts", "resolveRequestUser(request)", "pdp_bearer_auth");
mustContain("app/api/mobile/seller/products/[id]/route.ts", "buildMobileSellerProductDetailFromRequest", "seller_lot_detail_get");

const tests = spawnSync("npm", ["test", "--", "tests/mobile-lot-publish-truth.test.ts"], {
  stdio: "inherit",
  shell: false,
});
if (tests.status !== 0) process.exit(tests.status ?? 1);

const smoke = spawnSync("node", ["scripts/mobile-lot-publish-truth-staging-smoke.mjs"], {
  stdio: "inherit",
  shell: false,
});
if (smoke.status !== 0) process.exit(smoke.status ?? 1);

console.log("mobile-lot-publish-truth gate: PASS");
