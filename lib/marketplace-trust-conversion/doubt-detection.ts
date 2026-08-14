import type { BuyerDoubtReason, BuyerDoubtSnapshot } from "./types";

const MIN_VIEWS = 5;

export function buildBuyerDoubtSnapshot(input: {
  views: number;
  cartAdds: number;
  reviewsCount: number;
  imageCount: number;
  isNewSeller: boolean;
  deliverySlow: boolean;
  characteristicCount: number;
}): BuyerDoubtSnapshot {
  const reasons: BuyerDoubtReason[] = [
    {
      id: "no-reviews",
      label: "нет отзывов",
      active: input.reviewsCount === 0,
    },
    {
      id: "few-photos",
      label: "мало фотографий",
      active: input.imageCount < 3,
    },
    {
      id: "new-seller",
      label: "новый продавец",
      active: input.isNewSeller,
    },
    {
      id: "slow-delivery",
      label: "долгое ожидание доставки",
      active: input.deliverySlow,
    },
    {
      id: "no-specs",
      label: "мало характеристик",
      active: input.characteristicCount < 3,
    },
  ];

  const activeReasons = reasons.filter((r) => r.active);
  const show =
    input.views >= MIN_VIEWS && input.cartAdds === 0 && activeReasons.length > 0;

  return {
    enabled: true,
    show,
    views: input.views,
    cartAdds: input.cartAdds,
    reasons: show ? reasons : [],
  };
}
