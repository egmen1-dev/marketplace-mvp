/** Immutable Closed Alpha APK metadata — EPIC 80 source of truth */
export const CLOSED_ALPHA_APK = {
  versionName: "0.1.0-alpha",
  versionCode: 1,
  sha256: "91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585",
  artifactSizeBytes: 92668706,
  artifactFileName: "lot-android-alpha-0.1.0.apk",
  gitCommit: "750377f",
  releaseNotes: "APP-SHELL-0 Alpha foundation\nClosed Alpha launch gate",
} as const;

export const CLOSED_ALPHA_APK_DOWNLOAD_URL =
  process.env.MOBILE_APK_DOWNLOAD_URL ??
  "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.0/lot-android-alpha-0.1.0.apk";

export const CLOSED_ALPHA_GITHUB_RELEASE_URL =
  "https://github.com/egmen1-dev/marketplace-mvp/releases/tag/closed-alpha-0.1.0";
