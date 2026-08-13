import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  pickAudienceForCampaignType,
} from "@/lib/marketplace-communication/audiences";
import { buildCampaignsFromExecution } from "@/lib/marketplace-communication/campaigns";
import {
  markMessageApproved,
  prepareCampaignMessages,
} from "@/lib/marketplace-communication/messages";
import {
  assertMarketplaceCommunicationAccess,
  assertSellerCommunicationView,
  MarketplaceCommunicationForbiddenError,
} from "@/lib/marketplace-communication/permissions";
import {
  buildCommunicationSequences,
  sequenceForType,
} from "@/lib/marketplace-communication/sequences";
import {
  buildCommunicationTemplates,
  templateForCampaign,
} from "@/lib/marketplace-communication/templates";
import type {
  CommunicationAudience,
  MarketplaceCommunicationCampaign,
} from "@/lib/marketplace-communication/types";

const PREV_FLAG = process.env.MARKETPLACE_COMMUNICATION_ENABLED;

const audiences: CommunicationAudience[] = [
  {
    id: "audience-0",
    kind: "SELLERS_LOW_QUALITY_PRODUCTS",
    label: "Продавцы со слабыми карточками",
    description: "Completeness score ниже порога",
    estimatedSize: 150,
    source: "product_quality + execution",
  },
  {
    id: "audience-1",
    kind: "SELLERS_WITHOUT_PROMOTION",
    label: "Продавцы без продвижения",
    description: "Активные SKU без promotion campaign",
    estimatedSize: 80,
    source: "seller_growth + promotion",
  },
  {
    id: "audience-2",
    kind: "BUYERS_CATEGORY_INTEREST",
    label: "Покупатели с интересом к категории",
    description: "SEARCH_USED + PRODUCT_VIEW по категории",
    estimatedSize: 200,
    source: "buyer_intelligence",
  },
];

describe("pickAudienceForCampaignType", () => {
  it("maps product improvement to low quality sellers", () => {
    const picked = pickAudienceForCampaignType(
      audiences,
      "PRODUCT_IMPROVEMENT",
    );
    expect(picked?.kind).toBe("SELLERS_LOW_QUALITY_PRODUCTS");
  });

  it("maps promotion invite to sellers without promotion", () => {
    const picked = pickAudienceForCampaignType(audiences, "PROMOTION_INVITE");
    expect(picked?.kind).toBe("SELLERS_WITHOUT_PROMOTION");
  });

  it("maps category growth to buyer interest", () => {
    const picked = pickAudienceForCampaignType(audiences, "CATEGORY_GROWTH");
    expect(picked?.kind).toBe("BUYERS_CATEGORY_INTEREST");
  });
});

describe("buildCommunicationTemplates", () => {
  it("includes non-aggressive seller and buyer copy", () => {
    const templates = buildCommunicationTemplates();
    const improvement = templates.find((t) => t.id === "tpl-seller-improvement");
    expect(improvement?.body).toContain("улучшить фото");
    expect(improvement?.body).not.toMatch(/скидк/i);

    const buyer = templates.find((t) => t.id === "tpl-buyer-reactivation");
    expect(buyer?.body).toContain("Без навязчивых скидок");
  });

  it("resolves template by campaign type and audience", () => {
    const templates = buildCommunicationTemplates();
    const tpl = templateForCampaign(
      templates,
      "PRODUCT_IMPROVEMENT",
      "SELLERS_LOW_QUALITY_PRODUCTS",
    );
    expect(tpl?.id).toBe("tpl-seller-improvement");
  });
});

describe("buildCommunicationSequences", () => {
  it("plans seller activation on day 0, 7, 14", () => {
    const sequences = buildCommunicationSequences();
    const activation = sequenceForType(sequences, "SELLER_ACTIVATION");
    expect(activation?.steps.map((s) => s.dayOffset)).toEqual([0, 7, 14]);
    expect(activation?.steps[2].description).toContain("продвижения");
  });

  it("plans buyer reactivation after 7 days", () => {
    const sequences = buildCommunicationSequences();
    const reactivation = sequenceForType(sequences, "BUYER_REACTIVATION");
    expect(reactivation?.steps).toHaveLength(1);
    expect(reactivation?.steps[0].dayOffset).toBe(7);
  });
});

describe("prepareCampaignMessages", () => {
  it("creates pending approval messages for ready campaigns", () => {
    const templates = buildCommunicationTemplates();
    const campaigns: MarketplaceCommunicationCampaign[] = [
      {
        id: "campaign-0",
        type: "PRODUCT_IMPROVEMENT",
        title: "Улучшение карточек продавцов",
        source: "MARKETPLACE_EXECUTION",
        audience: audiences[0],
        status: "READY",
        createdAt: new Date().toISOString(),
        templateId: "tpl-seller-improvement",
        sequenceId: "seq-product-improvement",
        estimatedReach: 150,
      },
    ];

    const messages = prepareCampaignMessages({ campaigns, templates });
    expect(messages).toHaveLength(1);
    expect(messages[0].status).toBe("PENDING_APPROVAL");
    expect(messages[0].subject).toContain("карточку");

    const approved = markMessageApproved(messages[0]);
    expect(approved.status).toBe("APPROVED");
  });
});

describe("buildCampaignsFromExecution", () => {
  it("derives product improvement campaign from execution tasks", () => {
    const templates = buildCommunicationTemplates();
    const sequences = buildCommunicationSequences();
    const templateIds = new Map(
      templates.map((t) => [t.campaignType, t.id] as const),
    );
    const sequenceIds = new Map(
      sequences.map((s) => [s.campaignType, s.id] as const),
    );

    const campaigns = buildCampaignsFromExecution({
      tasks: [
        {
          id: "t1",
          planId: "p1",
          type: "PRODUCT_IMPROVEMENT",
          title: "Исправить карточки без фото",
          description: "d",
          owner: "ADMIN",
          priority: "HIGH",
          status: "PENDING",
          impact: "x",
          deadline: null,
        },
      ],
      audiences,
      templateIds,
      sequenceIds,
    });

    expect(campaigns.some((c) => c.type === "PRODUCT_IMPROVEMENT")).toBe(true);
    expect(campaigns[0]?.title).toBe("Улучшение карточек продавцов");
  });
});

describe("permissions", () => {
  it("allows admin communication access", () => {
    expect(() => assertMarketplaceCommunicationAccess("ADMIN")).not.toThrow();
  });

  it("denies seller from admin communication", () => {
    expect(() => assertMarketplaceCommunicationAccess("SELLER")).toThrow(
      MarketplaceCommunicationForbiddenError,
    );
  });

  it("allows seller to view lot recommendations", () => {
    expect(() => assertSellerCommunicationView("SELLER")).not.toThrow();
  });
});

describe("Feature flag", () => {
  beforeEach(() => {
    process.env.MARKETPLACE_COMMUNICATION_ENABLED = "true";
  });
  afterEach(() => {
    process.env.MARKETPLACE_COMMUNICATION_ENABLED = PREV_FLAG;
  });

  it("is enabled when env true", async () => {
    const { isMarketplaceCommunicationEnabled } = await import(
      "@/lib/marketplace-communication/flags"
    );
    expect(isMarketplaceCommunicationEnabled()).toBe(true);
  });
});
