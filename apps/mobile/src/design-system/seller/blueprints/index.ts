import { SELLER_HOME_BLUEPRINT } from "./seller-home.blueprint";
import {
  SELLER_AI_ASSISTANT_BLUEPRINT,
  SELLER_ANALYTICS_BLUEPRINT,
  SELLER_FINANCE_BLUEPRINT,
  SELLER_ORDERS_BLUEPRINT,
  SELLER_PRODUCT_DETAIL_BLUEPRINT,
  SELLER_PRODUCTS_BLUEPRINT,
  SELLER_PROMOTION_BLUEPRINT,
  SELLER_SHARED_BLUEPRINTS,
} from "./seller-screens.blueprint";
import type { SellerScreenBlueprint, SellerScreenId } from "./types";

export const SELLER_BLUEPRINTS: SellerScreenBlueprint[] = [
  ...SELLER_SHARED_BLUEPRINTS,
  SELLER_HOME_BLUEPRINT,
  SELLER_PRODUCTS_BLUEPRINT,
  SELLER_PRODUCT_DETAIL_BLUEPRINT,
  SELLER_ORDERS_BLUEPRINT,
  SELLER_FINANCE_BLUEPRINT,
  SELLER_ANALYTICS_BLUEPRINT,
  SELLER_PROMOTION_BLUEPRINT,
  SELLER_AI_ASSISTANT_BLUEPRINT,
];

export const SELLER_SCREEN_IDS: SellerScreenId[] = [
  "splash",
  "login",
  "seller_home",
  "seller_products",
  "seller_product_detail",
  "seller_orders",
  "seller_finance",
  "seller_analytics",
  "seller_promotion",
  "seller_ai_assistant",
  "profile",
];

export function getSellerBlueprint(id: SellerScreenId): SellerScreenBlueprint | undefined {
  return SELLER_BLUEPRINTS.find((b) => b.screenId === id);
}

export type { SellerScreenBlueprint, SellerScreenId } from "./types";
