#!/usr/bin/env tsx
/** Capture physical Android screenshot into design-review artifact convention */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { saveScreenshotMetadata } from "@/lib/product-design-review/screenshot/intake";
import type { ScreenshotMetadata } from "@/lib/product-design-review/types";

const release = process.env.DESIGN_REVIEW_RELEASE ?? "0.1.4-alpha";
const screen = process.env.DESIGN_REVIEW_SCREEN ?? "login";
const device = process.env.ADB_DEVICE ?? "";

function adb(cmd: string) {
  const prefix = device ? `adb -s ${device}` : "adb";
  return execSync(`${prefix} ${cmd}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function main() {
  const root = process.cwd();
  const dir = join(root, "artifacts/design-review", release, screen);
  mkdirSync(dir, { recursive: true });
  const remote = `/sdcard/design-review-${screen}.png`;
  const local = join(dir, "screenshot.png");

  adb(`shell screencap -p ${remote}`);
  adb(`pull ${remote} ${local}`);
  adb(`shell rm ${remote}`);

  let width = 1080;
  let height = 2400;
  let android = "unknown";
  let model = "unknown";
  try {
    android = adb("shell getprop ro.build.version.release");
    model = adb("shell getprop ro.product.model");
    const size = adb("shell wm size").match(/(\d+)x(\d+)/);
    if (size) {
      width = Number(size[1]);
      height = Number(size[2]);
    }
  } catch {
    // keep defaults
  }

  const metadata: ScreenshotMetadata = {
    screen,
    appVersion: release,
    build: process.env.MOBILE_BUILD_SHA ?? "local",
    device: model,
    android,
    width,
    height,
    theme: "light",
    capturedAt: new Date().toISOString(),
    operator: process.env.OPERATOR ?? "cloud-agent",
    redacted: true,
  };

  saveScreenshotMetadata(release, screen, metadata, root);
  console.log(JSON.stringify({ release, screen, screenshot: local, metadata }, null, 2));
}

main();
