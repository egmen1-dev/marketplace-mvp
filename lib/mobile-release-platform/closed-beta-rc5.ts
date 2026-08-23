/** Closed Beta RC5 — canonical release metadata (MRP BETA channel). */

export const CLOSED_BETA_RELEASE_RC5 = {
  versionName: "0.1.10-beta.1",
  versionCode: 9,
  sha256: "2d4041c5e29e31c25ac7cab65ce7d98d1c402ded5ba0307d71922cb220e3e4d1",
  artifactSizeBytes: 43492086,
  artifactFileName: "lot_android_closed_beta_0.1.10_beta.1.apk",
  gitCommit: "baf8cd1",
  githubTag: "closed-beta-rc5-0.1.10-beta.1",
  releaseNotes: [
    "Closed Beta RC5 — release-truth audit + physical validation build",
    "P0 commerce wiring: cart, favorites, catalog filters, seller nav",
    "Session warm on boot; commerce telemetry MOBILE_COMMERCE_ACTION",
    "Native About screen with build identity (version, SHA, RC5)",
    "Honest update flow: browser handoff → Android installer",
    "Visual polish: compact category chips, CatalogToolbar, BootSplash",
    "MRP publish for in-app update delivery (versionCode 9)",
  ].join("\n"),
  minAppVersion: "0.1.7-beta.1",
} as const;

export const CLOSED_BETA_RC5_DOWNLOAD_URL =
  process.env.CLOSED_BETA_RC5_DOWNLOAD_URL ??
  "https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/artifacts/closed-beta-rc5/lot_android_closed_beta_0.1.10_beta.1.apk";
