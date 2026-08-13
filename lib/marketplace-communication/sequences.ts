import type { CampaignType, CommunicationSequence } from "./types";

/** Planned touch sequences — scheduling only, no auto-send. */
export function buildCommunicationSequences(): CommunicationSequence[] {
  return [
    {
      id: "seq-seller-activation",
      campaignType: "SELLER_ACTIVATION",
      name: "SELLER_ACTIVATION",
      steps: [
        {
          dayOffset: 0,
          label: "Day 0",
          templateId: "tpl-seller-activation",
          description: "Рекомендация улучшить карточку",
        },
        {
          dayOffset: 7,
          label: "Day 7",
          templateId: "tpl-seller-activation",
          description: "Напоминание",
        },
        {
          dayOffset: 14,
          label: "Day 14",
          templateId: "tpl-promotion-invite",
          description: "Предложение продвижения",
        },
      ],
    },
    {
      id: "seq-product-improvement",
      campaignType: "PRODUCT_IMPROVEMENT",
      name: "PRODUCT_IMPROVEMENT",
      steps: [
        {
          dayOffset: 0,
          label: "Day 0",
          templateId: "tpl-seller-improvement",
          description: "Советы по карточке",
        },
        {
          dayOffset: 5,
          label: "Day 5",
          templateId: "tpl-seller-improvement",
          description: "Мягкое напоминание",
        },
      ],
    },
    {
      id: "seq-buyer-reactivation",
      campaignType: "BUYER_REACTIVATION",
      name: "BUYER_REACTIVATION",
      steps: [
        {
          dayOffset: 7,
          label: "Day 7",
          templateId: "tpl-buyer-reactivation",
          description: "В категории появились новые товары",
        },
      ],
    },
  ];
}

export function sequenceForType(
  sequences: CommunicationSequence[],
  type: CampaignType,
): CommunicationSequence | null {
  return sequences.find((s) => s.campaignType === type) ?? null;
}
