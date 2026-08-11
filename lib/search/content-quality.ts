/**
 * ProductContentQualityScore (TASK 058, section 22).
 *
 * A 0–100 score of how complete a product card is, with actionable hints.
 * No keyword stuffing is rewarded — only genuine completeness signals.
 */

export type ContentQualityInput = {
  title: string;
  description?: string | null;
  hasCategory: boolean;
  hasProductType: boolean;
  requiredCharacteristics: number;
  filledRequiredCharacteristics: number;
  optionalCharacteristics: number;
  filledOptionalCharacteristics: number;
  imageCount: number;
  hasMainImage: boolean;
  price: number;
  stock: number;
};

export type ContentQualityResult = {
  score: number; // 0..100
  hints: string[];
  breakdown: Record<string, number>;
};

/** Weighted completeness components (sum of maxima = 100). */
const COMPONENTS = {
  title: 15,
  description: 15,
  category: 10,
  productType: 10,
  requiredChars: 15,
  optionalChars: 10,
  mainImage: 10,
  images: 8,
  price: 4,
  stock: 3,
} as const;

const clampComponent = (value: number, max: number) =>
  Math.max(0, Math.min(max, value));

export function scoreContentQuality(
  input: ContentQualityInput,
): ContentQualityResult {
  const hints: string[] = [];
  const b: Record<string, number> = {};

  // Title: reward a descriptive length (not stuffing) up to a plateau.
  const titleLen = input.title.trim().length;
  b.title = clampComponent((Math.min(titleLen, 40) / 40) * COMPONENTS.title, COMPONENTS.title);
  if (titleLen < 15) hints.push("Добавьте более описательное название (тип, бренд, ключевой параметр).");

  // Description: reward meaningful length up to a plateau.
  const descLen = (input.description ?? "").trim().length;
  b.description = clampComponent((Math.min(descLen, 200) / 200) * COMPONENTS.description, COMPONENTS.description);
  if (descLen < 40) hints.push("Опишите товар подробнее (польза, комплектация, применение).");

  b.category = input.hasCategory ? COMPONENTS.category : 0;
  if (!input.hasCategory) hints.push("Укажите категорию каталога.");

  b.productType = input.hasProductType ? COMPONENTS.productType : 0;
  if (!input.hasProductType) hints.push("Выберите тип товара — это включит характеристики и фильтры.");

  // Required characteristics — full weight only when all filled.
  const reqRatio =
    input.requiredCharacteristics > 0
      ? input.filledRequiredCharacteristics / input.requiredCharacteristics
      : 1;
  b.requiredChars = clampComponent(reqRatio * COMPONENTS.requiredChars, COMPONENTS.requiredChars);
  if (input.requiredCharacteristics > 0 && reqRatio < 1) {
    hints.push("Заполните обязательные характеристики выбранного типа товара.");
  }

  const optRatio =
    input.optionalCharacteristics > 0
      ? input.filledOptionalCharacteristics / input.optionalCharacteristics
      : 1;
  b.optionalChars = clampComponent(optRatio * COMPONENTS.optionalChars, COMPONENTS.optionalChars);
  if (input.optionalCharacteristics > 0 && optRatio < 0.5) {
    hints.push("Дозаполните дополнительные характеристики — карточка станет заметнее в фильтрах.");
  }

  b.mainImage = input.hasMainImage ? COMPONENTS.mainImage : 0;
  if (!input.hasMainImage) hints.push("Добавьте главное фото товара.");

  // Extra images: reward up to 4 photos.
  const extra = Math.max(0, input.imageCount - 1);
  b.images = clampComponent((Math.min(extra, 3) / 3) * COMPONENTS.images, COMPONENTS.images);
  if (input.imageCount < 3) hints.push("Добавьте больше фотографий (рекомендуем 3–5).");

  b.price = input.price > 0 ? COMPONENTS.price : 0;
  if (!(input.price > 0)) hints.push("Укажите цену.");

  b.stock = input.stock > 0 ? COMPONENTS.stock : 0;
  if (!(input.stock > 0)) hints.push("Пополните склад — товары без остатка ранжируются ниже.");

  const score = Math.round(
    Object.values(b).reduce((a, x) => a + x, 0),
  );

  return { score: Math.max(0, Math.min(100, score)), hints, breakdown: b };
}
