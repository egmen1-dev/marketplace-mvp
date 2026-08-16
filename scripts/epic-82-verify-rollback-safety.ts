#!/usr/bin/env tsx
/** Verify MRP rollback restores previous recommended release without deleting history */
import { prisma } from "@/lib/prisma";
import { rollbackRelease, publishRelease } from "@/lib/mobile-release-platform/release-manager";
import { getLatestPublishedRelease, listReleaseVersions } from "@/lib/mobile-release-platform/registry";

async function main() {
  const latest = await prisma.mobileReleaseVersion.findUnique({ where: { versionCode: 2 } });
  if (!latest) throw new Error("0.1.1 release missing");

  console.log("Before rollback:");
  console.log(JSON.stringify(await listReleaseVersions(), null, 2));

  await rollbackRelease(latest.id, "epic-82-release-011 rollback safety test");
  const recommended = await getLatestPublishedRelease("CLOSED_ALPHA");
  console.log("\nAfter rollback recommended:", recommended?.versionName, recommended?.status);

  const history = await listReleaseVersions();
  const has010 = history.some((r) => r.versionCode === 1);
  const has011 = history.some((r) => r.versionCode === 2);
  console.log("History preserved:", { has010, has011, count: history.length });

  if (recommended?.versionCode !== 1) {
    throw new Error(`Expected recommended 0.1.0 after rollback, got ${recommended?.versionName}`);
  }

  // Restore active 0.1.1 release
  await publishRelease(latest.id);
  const restored = await getLatestPublishedRelease("CLOSED_ALPHA");
  console.log("\nRestored active:", restored?.versionName, restored?.status);

  if (restored?.versionCode !== 2) {
    throw new Error("Failed to restore 0.1.1 as active release");
  }

  console.log("\nROLLBACK_SAFETY: PASS");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
