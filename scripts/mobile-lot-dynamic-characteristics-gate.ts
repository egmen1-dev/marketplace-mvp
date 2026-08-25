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

mustContain("lib/mobile/lot-characteristics.ts", "humanCharacteristicPrompt", "shared_characteristics_lib");
mustContain("apps/mobile/app/sell/create.tsx", "LotCharacteristicsSection", "characteristics_section_usage");
mustContain("apps/mobile/src/seller/use-lot-create-form.ts", "validateLotCharacteristicForm", "preview_validation");
mustContain("apps/mobile/src/api/seller-lot.ts", "fetchProductTypeCharacteristics", "schema_fetch");
mustContain("apps/mobile/app/sell/create.tsx", "characteristicPreviewRows", "preview_characteristics");
mustContain(
  "app/api/mobile/seller/product-types/[productTypeId]/characteristics/route.ts",
  "getProductTypeWithCharacteristics",
  "mobile_characteristics_api",
);

const tests = spawnSync("npm", ["test", "--", "tests/mobile-lot-dynamic-characteristics.test.ts"], {
  stdio: "inherit",
  shell: false,
});
if (tests.status !== 0) process.exit(tests.status ?? 1);

const smoke = spawnSync("node", ["scripts/mobile-lot-dynamic-characteristics-staging-smoke.mjs"], {
  stdio: "inherit",
  shell: false,
});
if (smoke.status !== 0) process.exit(smoke.status ?? 1);

console.log("mobile-lot-dynamic-characteristics gate: PASS");
