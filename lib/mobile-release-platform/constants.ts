/** Immutable Closed Alpha APK metadata — EPIC 80 / EPIC 82 / EPIC 83 source of truth */

export const CLOSED_ALPHA_RELEASE_010 = {
  versionName: "0.1.0-alpha",
  versionCode: 1,
  sha256: "91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585",
  artifactSizeBytes: 92668706,
  artifactFileName: "lot-android-alpha-0.1.0.apk",
  gitCommit: "750377f",
  releaseNotes: "APP-SHELL-0 Alpha foundation\nClosed Alpha launch gate",
  githubTag: "closed-alpha-0.1.0",
  supportStatus: "PROTOTYPE_UNSUPPORTED",
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
  ],
  acceptanceStatus: "PUBLISHED",
  supportStatus: "TRANSITIONAL",
} as const;

/** EPIC 83 — First supported Closed Alpha baseline (0.1.2-alpha) */
export const CLOSED_ALPHA_RELEASE_012 = {
  versionName: "0.1.2-alpha",
  versionCode: 3,
  sha256: "8cf4217c183885ed307e03d6667e039d7e5934743fd7f72f638293d76021b407",
  artifactSizeBytes: 93609459,
  artifactFileName: "lot-android-alpha-0.1.2.apk",
  gitCommit: "feb4b8d",
  releaseNotes:
    "First supported Closed Alpha baseline\nMobile UX Wave 1/2\nSeller product navigation fix\nNew design system\nImproved catalog and PDP\nStartup timeout and retry\nMinimum supported version enforcement\nUnsupported client screen\nUpdate-flow hardening",
  githubTag: "closed-alpha-0.1.2",
  knownIssues: ["Physical Android acceptance pending operator pass", "Seamless update E2E pending 0.1.2→0.1.3"],
  acceptanceStatus: "PUBLISHED",
  supportStatus: "FIRST_SUPPORTED",
} as const;

/** EPIC 84 — Closed Alpha 0.1.3-alpha (P0/P1 diagnostics + buyer funnel sprints) */
export const CLOSED_ALPHA_RELEASE_013 = {
  versionName: "0.1.3-alpha",
  versionCode: 4,
  sha256: "b2e7a07d811ab9e8561eac849e282adc9477fb75495302f488c8404f11166859",
  artifactSizeBytes: 105632443,
  artifactFileName: "lot-android-alpha-0.1.3.apk",
  gitCommit: "478f8cb",
  releaseNotes:
    "EPIC-84 Startup Diagnostics P0\nCrash & Diagnostics P1\nStartup ID / Stage / Error Code\nCopy & Export diagnostics\nConnectivity panel\nHidden diagnostics screen\nLogin Sprint 1\nBuyer Home Sprint 2\nCatalog Sprint 3\nPDP Sprint 4\nBuild metadata on startup error",
  githubTag: "closed-alpha-0.1.3",
  knownIssues: ["Physical Android acceptance required for 0.1.3 cohort", "Cart/Checkout sprints pending"],
  acceptanceStatus: "PUBLISHED",
  supportStatus: "FIRST_SUPPORTED",
} as const;

/** EPIC 84 P0 — Closed Alpha 0.1.4-alpha hotfix (startup crash guard + lazy routes) */
export const CLOSED_ALPHA_RELEASE_014 = {
  versionName: "0.1.4-alpha",
  versionCode: 5,
  sha256: "b50a3c44be0094461b3ce1ee17241901b122d0d3ce425708959b0b48da09940c",
  artifactSizeBytes: 105750351,
  artifactFileName: "lot-android-alpha-0.1.4.apk",
  gitCommit: "pending-hotfix",
  releaseNotes:
    "P0 startup crash hotfix\nLazy Expo Router imports (no sync eager route graph)\nNew Architecture disabled for release stability\nDeferred NetworkBanner/UpdateHost until post-bootstrap\nStartup Fatal Error recovery layer\nBoot stage logcat markers (NATIVE_START / ROUTER_ENTRY)\nPrevious crash detection on next launch\n0.1.4-alpha versionCode 5",
  githubTag: "closed-alpha-0.1.4",
  knownIssues: ["Physical 10× cold-launch acceptance required before cohort expansion"],
  acceptanceStatus: "PENDING_PHYSICAL",
  supportStatus: "FIRST_SUPPORTED",
} as const;

/** Current active Closed Alpha release pointer — update after 0.1.4 physical PASS */
export const CLOSED_ALPHA_APK = CLOSED_ALPHA_RELEASE_014;

export const CLOSED_ALPHA_APK_PREVIOUS = CLOSED_ALPHA_RELEASE_013;

export const CLOSED_ALPHA_APK_DOWNLOAD_URL =
  process.env.MOBILE_APK_DOWNLOAD_URL ??
  "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.4/lot-android-alpha-0.1.4.apk";

export const CLOSED_ALPHA_APK_PREVIOUS_DOWNLOAD_URL =
  "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.3/lot-android-alpha-0.1.3.apk";

export const CLOSED_ALPHA_GITHUB_RELEASE_URL =
  "https://github.com/egmen1-dev/marketplace-mvp/releases/tag/closed-alpha-0.1.4";

export const CLOSED_ALPHA_GITHUB_PREVIOUS_RELEASE_URL =
  "https://github.com/egmen1-dev/marketplace-mvp/releases/tag/closed-alpha-0.1.3";
