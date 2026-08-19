/** Closed Beta RC2 — canonical release metadata (MRP BETA channel). */

export const CLOSED_BETA_RELEASE_RC2 = {
  versionName: "0.1.7-beta.1",
  versionCode: 6,
  sha256: "dfc86aa3ca4f3e77397b87a364f12a5e2fd3cf43de96a8b41d7edc23576da13c",
  artifactSizeBytes: 93651247,
  artifactFileName: "lot_android_closed_beta_0.1.7_beta.1.apk",
  gitCommit: "7f12bde",
  githubTag: "closed-beta-rc2-0.1.7-beta.1",
  releaseNotes: [
    "Closed Beta RC2 — canonical main build",
    "P0 bootstrap diagnostics + 60s boot timeout",
    "P0 post-login native navigation fix",
    "HTTPS-only network security on Android",
    "Staging API: web-production-e56fb.up.railway.app",
  ].join("\n"),
  minAppVersion: "0.1.6-beta.2",
} as const;

export const CLOSED_BETA_RC2_DOWNLOAD_URL =
  process.env.CLOSED_BETA_RC2_DOWNLOAD_URL ??
  "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-beta-rc2-0.1.7-beta.1/lot_android_closed_beta_0.1.7_beta.1.apk";

export const CLOSED_BETA_RC2_RAW_DOWNLOAD_URL =
  "https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/artifacts/closed-beta-rc2/lot_android_closed_beta_0.1.7_beta.1.apk";
