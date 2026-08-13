import { OrderStatus, ProductStatus } from "@prisma/client";

import { ROUTES } from "@/lib/constants";
import { loadSellerProgressSignals } from "@/lib/seller-lifecycle/progress";
import { prisma } from "@/lib/prisma";

import {
  dismissWelcomeScreen,
  ensureExperienceStarted,
  getSellerExperienceProgress,
  markExperienceCompleted,
  syncExperienceStep,
} from "./experience";
import {
  shouldRedirectToSellerStart,
  shouldShowNextStepBanner,
  shouldShowWelcomeScreen,
} from "./eligibility";
import { isSellerFirstEntryEnabled } from "./flags";
import { buildSellerFirstEntryGuide } from "./guide";
import {
  buildFirstEntryJourney,
  computeFirstEntryProgress,
  isFirstEntryComplete,
  resolveFirstEntryStep,
} from "./progress";
import type {
  AdminSellerActivation,
  SellerFirstEntryDashboard,
  SellerFirstEntryNotification,
} from "./types";

export async function getSellerFirstEntryDashboard(
  sellerProfileId: string,
): Promise<SellerFirstEntryDashboard> {
  if (!isSellerFirstEntryEnabled()) {
    return {
      enabled: false,
      showWelcome: false,
      showNextStep: false,
      step: "SELLER_START",
      progressCurrent: 0,
      progressTotal: 5,
      journey: [],
      guide: {
        headline: "SELLER_FIRST_ENTRY_ENABLED=false",
        why: "",
        actions: [],
        ctaLabel: "",
        ctaHref: ROUTES.ACCOUNT,
        tone: "info",
      },
      experience: null,
      qualityScore: 0,
    };
  }

  const [signals, experience] = await Promise.all([
    loadSellerProgressSignals(sellerProfileId),
    getSellerExperienceProgress(sellerProfileId),
  ]);

  const step = resolveFirstEntryStep(signals);
  const journey = buildFirstEntryJourney(step);
  const progress = computeFirstEntryProgress(step);
  const guide = buildSellerFirstEntryGuide({ step, signals });

  if (isFirstEntryComplete(step) && !experience?.completedAt) {
    await markExperienceCompleted(sellerProfileId);
  } else if (experience?.startedAt) {
    await syncExperienceStep(sellerProfileId, step);
  }

  return {
    enabled: true,
    showWelcome: shouldShowWelcomeScreen({ signals, experience }),
    showNextStep: shouldShowNextStepBanner({ signals, experience }),
    step,
    progressCurrent: progress.current,
    progressTotal: progress.total,
    journey,
    guide,
    experience,
    qualityScore: signals.bestCompletenessScore,
  };
}

export async function startSellerFirstExperience(
  sellerProfileId: string,
): Promise<void> {
  const signals = await loadSellerProgressSignals(sellerProfileId);
  const step = resolveFirstEntryStep(signals);
  await ensureExperienceStarted(sellerProfileId, step);
}

export async function dismissSellerWelcome(
  sellerProfileId: string,
): Promise<void> {
  await dismissWelcomeScreen(sellerProfileId);
}

export async function getAdminSellerActivation(): Promise<AdminSellerActivation> {
  if (!isSellerFirstEntryEnabled()) {
    return {
      enabled: false,
      newSellers: 0,
      startedOnboarding: 0,
      completedOnboarding: 0,
      createdFirstProduct: 0,
      firstSale: 0,
    };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [newSellers, startedOnboarding, completedOnboarding, createdFirstProduct, firstSale] =
    await Promise.all([
      prisma.sellerProfile.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.sellerExperienceProgress.count(),
      prisma.sellerExperienceProgress.count({
        where: { completedAt: { not: null } },
      }),
      prisma.product.groupBy({
        by: ["sellerId"],
        where: { createdAt: { gte: thirtyDaysAgo } },
      }).then((rows) => rows.length),
      prisma.order.count({
        where: {
          status: { not: OrderStatus.CANCELLED },
          items: {
            some: {
              product: { createdAt: { gte: thirtyDaysAgo } },
            },
          },
        },
      }),
    ]);

  return {
    enabled: true,
    newSellers,
    startedOnboarding,
    completedOnboarding,
    createdFirstProduct,
    firstSale,
  };
}

export async function getSellerFirstEntryNotifications(input: {
  sellerProfileId: string;
}): Promise<SellerFirstEntryNotification[]> {
  if (!isSellerFirstEntryEnabled()) return [];

  const dashboard = await getSellerFirstEntryDashboard(input.sellerProfileId);
  if (!dashboard.showNextStep && !dashboard.showWelcome) return [];

  const now = new Date().toISOString();
  const notifications: SellerFirstEntryNotification[] = [];

  if (dashboard.showWelcome) {
    notifications.push({
      id: "first-entry-start-guide",
      type: "SELLER_START_GUIDE",
      title: "Добро пожаловать в ЛОТ",
      body: "Начнём с вашего первого товара",
      href: ROUTES.ACCOUNT_SELLER_START,
      createdAt: now,
      read: false,
    });
  }

  if (dashboard.showNextStep) {
    notifications.push({
      id: `first-entry-next-${dashboard.step}`,
      type: "SELLER_NEXT_STEP",
      title: "Ваш следующий шаг",
      body: dashboard.guide.headline,
      href: dashboard.guide.ctaHref,
      createdAt: now,
      read: false,
    });
  }

  if (dashboard.step === "PRODUCT_PUBLISHED" || dashboard.step === "FIRST_ORDER") {
    notifications.push({
      id: `first-entry-milestone-${dashboard.step}`,
      type: "SELLER_MILESTONE",
      title: dashboard.guide.headline,
      body: dashboard.guide.why,
      href: dashboard.guide.ctaHref,
      createdAt: now,
      read: false,
    });
  }

  return notifications.slice(0, 4);
}

export async function checkSellerEntryRedirect(input: {
  sellerProfileId: string;
  pathname: string;
}): Promise<string | null> {
  if (!isSellerFirstEntryEnabled()) return null;
  if (input.pathname.startsWith(ROUTES.ACCOUNT_SELLER_START)) return null;

  const [signals, experience] = await Promise.all([
    loadSellerProgressSignals(input.sellerProfileId),
    getSellerExperienceProgress(input.sellerProfileId),
  ]);

  if (
    shouldRedirectToSellerStart({
      signals,
      experience,
      pathname: input.pathname,
    })
  ) {
    return ROUTES.ACCOUNT_SELLER_START;
  }
  return null;
}
