import type { SellerScreenId } from "../blueprints/types";

export type SellerSprintDefinition = {
  sprint: number;
  name: string;
  screenId: SellerScreenId;
  deliverable: string;
  gate: string;
  blockedBy: string;
};

/** Seller Experience implementation roadmap — EPIC 86 → Sprints 1–8 */
export const SELLER_SPRINT_ROADMAP: SellerSprintDefinition[] = [
  {
    sprint: 1,
    name: "Seller Home",
    screenId: "seller_home",
    deliverable: "Revenue-first operational home — all 10 blueprint blocks",
    gate: "product:epic-86:sprint1-seller-home",
    blockedBy: "EPIC 86 architecture approval",
  },
  {
    sprint: 2,
    name: "Products",
    screenId: "seller_products",
    deliverable: "Seller product catalog with revenue KPI cards",
    gate: "product:epic-86:sprint2-products",
    blockedBy: "Sprint 1 PASS",
  },
  {
    sprint: 3,
    name: "Product Detail",
    screenId: "seller_product_detail",
    deliverable: "Seller PDP — stock, conversion, AI insight",
    gate: "product:epic-86:sprint3-product-detail",
    blockedBy: "Sprint 2 PASS",
  },
  {
    sprint: 4,
    name: "Orders",
    screenId: "seller_orders",
    deliverable: "Seller order queue with SLA and actions",
    gate: "product:epic-86:sprint4-orders",
    blockedBy: "Sprint 3 PASS",
  },
  {
    sprint: 5,
    name: "Finance",
    screenId: "seller_finance",
    deliverable: "Wallet redesign — trust-first finance center",
    gate: "product:epic-86:sprint5-finance",
    blockedBy: "Sprint 4 PASS",
  },
  {
    sprint: 6,
    name: "Analytics",
    screenId: "seller_analytics",
    deliverable: "Revenue charts and drill-down",
    gate: "product:epic-86:sprint6-analytics",
    blockedBy: "Sprint 5 PASS",
  },
  {
    sprint: 7,
    name: "Promotion",
    screenId: "seller_promotion",
    deliverable: "Campaign overview and growth CTA",
    gate: "product:epic-86:sprint7-promotion",
    blockedBy: "Sprint 6 PASS",
  },
  {
    sprint: 8,
    name: "AI Assistant",
    screenId: "seller_ai_assistant",
    deliverable: "AI insight → action conversion",
    gate: "product:epic-86:sprint8-ai-assistant",
    blockedBy: "Sprint 7 PASS",
  },
];

export const SELLER_IMPLEMENTATION_RULES = [
  "No screen implementation before EPIC 86 architecture gate PASS",
  "No CRUD forms — web cabinet for create/edit",
  "No Admin Panel patterns",
  "Each sprint: blueprint → hook → experience → design-system components → gate",
  "Reuse existing APIs only — no backend changes",
] as const;
