#!/usr/bin/env tsx
/** EPIC 158.3 — Seller Create Final UX + Update Flow Reliability gate */
import { readFileSync } from "node:fs";

const checks: Array<{ id: string; ok: boolean; detail: string }> = [];

function pass(id: string, detail: string) {
  checks.push({ id, ok: true, detail });
}

function fail(id: string, detail: string) {
  checks.push({ id, ok: false, detail });
}

function mustContain(file: string, needle: string, id: string) {
  const src = readFileSync(file, "utf8");
  if (src.includes(needle)) pass(id, `${file} contains ${needle}`);
  else fail(id, `${file} missing ${needle}`);
}

mustContain("apps/mobile/src/seller/lot-create-copy.ts", "Не получилось опубликовать ЛОТ", "publish_error_copy");
mustContain("apps/mobile/app/sell/create.tsx", "LotCreatePreviewFooter", "preview_footer");
mustContain("apps/mobile/app/sell/create.tsx", 'resizeMode="cover"', "preview_photo_cover");
mustContain("apps/mobile/src/update/use-update-check.ts", "AppState.addEventListener", "foreground_refresh");
mustContain("apps/mobile/src/components/UpdateGate.tsx", "UPDATE_UI_LABELS.updateNow", "update_modal_cta");
mustContain("apps/mobile/src/components/ProfileMenu.tsx", "Обновление доступно", "profile_update_badge");
mustContain("apps/mobile/app/(tabs)/profile.tsx", "useUpdateAvailabilityBadge", "profile_badge_hook");
mustContain("apps/mobile/src/store/app-store.ts", "updateAvailable", "update_available_store");

const failed = checks.filter((c) => !c.ok);
const verdict = failed.length === 0 ? "PASS" : "FAIL";

console.log(
  JSON.stringify(
    {
      epic: "EPIC_158_3",
      verdict,
      status: failed.length === 0 ? "READY_FOR_SELLER_BETA" : "BLOCKED",
      checks,
      failed: failed.map((c) => c.id),
    },
    null,
    2,
  ),
);

process.exit(failed.length === 0 ? 0 : 1);
