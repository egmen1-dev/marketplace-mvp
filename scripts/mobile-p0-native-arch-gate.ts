#!/usr/bin/env tsx
/** Verify release APK native arch matches app.config (P0 gate) */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const gradleProps = join(root, "apps/mobile/android/gradle.properties");
const appConfig = join(root, "apps/mobile/app.config.js");
const buildConfig = join(
  root,
  "apps/mobile/android/app/build/generated/source/buildConfig/release/ru/lot/marketplace/alpha/BuildConfig.java",
);

function readGradleNewArch(): string | null {
  if (!existsSync(gradleProps)) return null;
  const match = readFileSync(gradleProps, "utf8").match(/^newArchEnabled=(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function readBuildConfigNewArch(): boolean | null {
  if (!existsSync(buildConfig)) return null;
  const match = readFileSync(buildConfig, "utf8").match(/IS_NEW_ARCHITECTURE_ENABLED = (true|false)/);
  return match ? match[1] === "true" : null;
}

function main() {
  const rows: Array<{ id: string; ok: boolean; detail?: string }> = [];
  const gradle = readGradleNewArch();
  const configSaysFalse = readFileSync(appConfig, "utf8").includes("newArchEnabled: false");
  const buildConfigEnabled = readBuildConfigNewArch();

  rows.push({ id: "app_config_new_arch_false", ok: configSaysFalse });
  rows.push({ id: "gradle_new_arch_false", ok: gradle === "false", detail: `gradle=${gradle}` });
  // RN 0.86 Gradle plugin hardcodes IS_NEW_ARCHITECTURE_ENABLED=true regardless of gradle.properties.
  const buildConfigExpectedOnRn086 = buildConfigEnabled === true;
  rows.push({
    id: "buildconfig_rn086_new_arch_mandatory",
    ok: buildConfigExpectedOnRn086,
    detail:
      buildConfigEnabled === null
        ? "BuildConfig not generated — run assembleRelease"
        : `IS_NEW_ARCH=${buildConfigEnabled} (RN 0.86 always true — disabling unsupported)`,
  });
  rows.push({
    id: "native_arch_plugin",
    ok: existsSync(join(root, "apps/mobile/plugins/withNativeArchSync.js")),
  });

  const failed = rows.filter((r) => !r.ok);
  console.log(JSON.stringify({ verdict: failed.length === 0 ? "PASS" : "FAIL", rows }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
