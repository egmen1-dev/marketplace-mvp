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

/** EPIC 82 — Closed Alpha 0.1.1 release artifact (built 2026-08-16) */
export const CLOSED_ALPHA_RELEASE_011 = {
  versionName: "0.1.1-alpha",
  versionCode: 2,
  sha256: "bf17bebf67d06078b552a7fadac517fb8eccf8791f3724d543bfb41dfcfa1392",
  artifactSizeBytes: 93599499,
  artifactFileName: "lot-android-alpha-0.1.1.apk",
  gitCommit: "1e872b7",
  releaseNotes:
    "Новый интерфейс каталога\nОбновлённые карточки товаров\nУлучшенный PDP\nИсправлен вход в товар продавца\nНовые иконки навигации\nОбновлён seller dashboard\nУлучшен кошелёк\nУлучшены loading / empty states\nДобавлена система обновлений",
  githubTag: "closed-alpha-0.1.1",
  knownIssues: [
    "Wallet full ledger requires future mobile API",
    "Seller sales detail pending backend endpoint",
    "Physical Android update E2E pending operator pass",
  ],
  acceptanceStatus: "PUBLISHED",
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
