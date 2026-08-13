import type {
  AudienceKind,
  CampaignType,
  CommunicationTemplate,
} from "./types";

const SELLER_IMPROVEMENT_BODY = `Ваш товар смотрят, но покупают редко.

Мы нашли несколько способов увеличить продажи:
- улучшить фото
- добавить характеристики
- запустить продвижение

Это рекомендация ЛОТ — без автоматических изменений.`;

const BUYER_CATEGORY_BODY = `Вы смотрели электроинструменты.

Появились новые предложения — загляните в каталог, когда будет удобно.`;

/** Non-aggressive message templates — prep only. */
export function buildCommunicationTemplates(): CommunicationTemplate[] {
  return [
    {
      id: "tpl-seller-improvement",
      campaignType: "PRODUCT_IMPROVEMENT",
      audienceKind: "SELLERS_LOW_QUALITY_PRODUCTS",
      subject: "Как улучшить карточку товара",
      body: SELLER_IMPROVEMENT_BODY,
      tone: "helpful",
    },
    {
      id: "tpl-seller-activation",
      campaignType: "SELLER_ACTIVATION",
      audienceKind: "SELLERS_NO_SALES_30_DAYS",
      subject: "Ваш магазин на ЛОТ — следующий шаг",
      body: `Заметили интерес к вашим товарам, но покупок пока мало.

Рекомендуем:
- проверить цены и описание
- добавить фото
- рассмотреть продвижение

Ответьте действием в кабинете — мы не меняем карточки автоматически.`,
      tone: "helpful",
    },
    {
      id: "tpl-promotion-invite",
      campaignType: "PROMOTION_INVITE",
      audienceKind: "SELLERS_WITHOUT_PROMOTION",
      subject: "Продвижение для готовых SKU",
      body: `У вас есть товары, которые могут выиграть от продвижения.

Посмотрите рекомендации в разделе «Продвижение» — запуск только после вашего подтверждения.`,
      tone: "neutral",
    },
    {
      id: "tpl-category-growth",
      campaignType: "CATEGORY_GROWTH",
      audienceKind: "BUYERS_CATEGORY_INTEREST",
      subject: "Новые предложения в интересующей категории",
      body: BUYER_CATEGORY_BODY,
      tone: "helpful",
    },
    {
      id: "tpl-buyer-reactivation",
      campaignType: "BUYER_REACTIVATION",
      audienceKind: "BUYERS_ABANDONED_CART",
      subject: "Вы смотрели товары на ЛОТ",
      body: `В корзине или истории просмотров остались интересные позиции.

Загляните в каталог — ассортимент обновился. Без навязчивых скидок.`,
      tone: "neutral",
    },
  ];
}

export function templateForCampaign(
  templates: CommunicationTemplate[],
  type: CampaignType,
  audienceKind: AudienceKind,
): CommunicationTemplate | null {
  return (
    templates.find(
      (t) => t.campaignType === type && t.audienceKind === audienceKind,
    ) ??
    templates.find((t) => t.campaignType === type) ??
    null
  );
}
