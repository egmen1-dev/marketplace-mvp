import { auditAdminOperations, getAdminOperationsOverview } from "./admin-operations";
import { auditBuyerFlow } from "./buyer-flow";
import { auditDeliveryFlow } from "./delivery-flow";
import { isMarketplaceFoundationAuditEnabled } from "./flags";
import { auditModerationFlow } from "./moderation-flow";
import {
  auditOrderFlow,
  buildOrderLifecycleHealth,
} from "./order-flow";
import { auditPaymentFlow } from "./payment-flow";
import { buildAreaResult, computeFoundationScore } from "./readiness-score";
import {
  buildCriticalIssues,
  buildFoundationRecommendations,
  buildLaunchChecklist,
} from "./recommendations";
import { auditReviewFlow } from "./review-flow";
import { auditSecurityChecks } from "./security-checks";
import { auditSellerFlow } from "./seller-flow";
import type { MarketplaceFoundationReport } from "./types";
import { AREA_WEIGHTS } from "./types";

const disabledReport: MarketplaceFoundationReport = {
  enabled: false,
  score: {
    total: 0,
    label: "critical",
    headline: "MARKETPLACE_FOUNDATION_AUDIT_ENABLED=false",
    areas: [],
  },
  orderLifecycle: {
    deliveryTransitions: 0,
    pickupTransitions: 0,
    totalTransitions: 0,
    missing: 0,
    risk: "HIGH",
    summary: "",
  },
  recommendations: [],
  checklist: [],
  criticalIssues: [],
  operations: {
    enabled: false,
    orders: { newCount: 0, problemCount: 0, overdueCount: 0 },
    sellers: { newCount: 0, activeCount: 0, problemCount: 0 },
    products: { pendingReview: 0, rejected: 0, noSales: 0 },
    finance: { pendingPayments: 0, pendingPayouts: 0, openDisputes: 0 },
    trust: { openReports: 0, riskFlags: 0 },
  },
};

export async function getMarketplaceFoundationReport(): Promise<MarketplaceFoundationReport> {
  if (!isMarketplaceFoundationAuditEnabled()) return disabledReport;

  const operations = await getAdminOperationsOverview();

  const areas = [
    buildAreaResult({
      area: "buyer",
      title: "Buyer journey",
      checks: auditBuyerFlow(),
      weight: AREA_WEIGHTS.buyer,
    }),
    buildAreaResult({
      area: "seller",
      title: "Seller journey",
      checks: auditSellerFlow(),
      weight: AREA_WEIGHTS.seller,
    }),
    buildAreaResult({
      area: "order",
      title: "Order lifecycle",
      checks: auditOrderFlow(),
      weight: AREA_WEIGHTS.order,
    }),
    buildAreaResult({
      area: "payment",
      title: "Payments & finance",
      checks: auditPaymentFlow(),
      weight: AREA_WEIGHTS.payment,
    }),
    buildAreaResult({
      area: "delivery",
      title: "Delivery",
      checks: auditDeliveryFlow(),
      weight: AREA_WEIGHTS.delivery,
    }),
    buildAreaResult({
      area: "review",
      title: "Reviews & trust",
      checks: auditReviewFlow(),
      weight: AREA_WEIGHTS.review,
    }),
    buildAreaResult({
      area: "moderation",
      title: "Moderation",
      checks: auditModerationFlow(),
      weight: AREA_WEIGHTS.moderation,
    }),
    buildAreaResult({
      area: "operations",
      title: "Operations",
      checks: [...auditAdminOperations(operations), ...auditSecurityChecks()],
      weight: AREA_WEIGHTS.operations,
    }),
  ];

  const score = computeFoundationScore(areas);
  const orderLifecycle = buildOrderLifecycleHealth();
  const recommendations = buildFoundationRecommendations(areas);
  const checklist = buildLaunchChecklist(areas);
  const criticalIssues = buildCriticalIssues(areas);

  return {
    enabled: true,
    score,
    orderLifecycle,
    recommendations,
    checklist,
    criticalIssues,
    operations,
  };
}

export { getAdminOperationsOverview };
