/** Immutable Closed Alpha APK metadata — EPIC 80 / EPIC 82 source of truth */

export const CLOSED_ALPHA_RELEASE_010 = {
  versionName: "0.1.0-alpha",
  versionCode: 1,
  sha256: "91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585",
  artifactSizeBytes: 92668706,
  artifactFileName: "lot-android-alpha-0.1.0.apk",
  gitCommit: "750377f",
  releaseNotes: "APP-SHELL-0 Alpha foundation\nClosed Alpha launch gate",
  githubTag: "closed-alpha-0.1.0",
} as const;

/** EPIC 82 — post Wave 2 UX hardening. SHA256 updated after APK build + `sha256sum`. */
export const CLOSED_ALPHA_RELEASE_011 = {
  versionName: "0.1.1-alpha",
  versionCode: 2,
  sha256: "pending-build-run-sha256sum-after-apk",
  artifactSizeBytes: null as number | null,
  artifactFileName: "lot-android-alpha-0.1.1.apk",
  gitCommit: "757c6c7",
  releaseNotes:
    "EPIC 81 Wave 2 commerce UX\nИсправлены карточки товаров\nУлучшен каталог и buyer home\nИсправлен кабинет продавца\nSeamless update flow v1",
  githubTag: "closed-alpha-0.1.1",
  knownIssues: [
    "Wallet full ledger requires future mobile API",
    "Seller sales detail pending backend endpoint",
    "Physical Android acceptance required before cohort",
  ],
  acceptanceStatus: "PENDING_PHYSICAL",
} as const;

/** Current active Closed Alpha release pointer */
export const CLOSED_ALPHA_APK = CLOSED_ALPHA_RELEASE_011;

export const CLOSED_ALPHA_APK_PREVIOUS = CLOSED_ALPHA_RELEASE_010;

export const CLOSED_ALPHA_APK_DOWNLOAD_URL =
  process.env.MOBILE_APK_DOWNLOAD_URL ??
  "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.1/lot-android-alpha-0.1.1.apk";

export const CLOSED_ALPHA_APK_PREVIOUS_DOWNLOAD_URL =
  "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.0/lot-android-alpha-0.1.0.apk";

export const CLOSED_ALPHA_GITHUB_RELEASE_URL =
  "https://github.com/egmen1-dev/marketplace-mvp/releases/tag/closed-alpha-0.1.1";

export const CLOSED_ALPHA_GITHUB_PREVIOUS_RELEASE_URL =
  "https://github.com/egmen1-dev/marketplace-mvp/releases/tag/closed-alpha-0.1.0";
