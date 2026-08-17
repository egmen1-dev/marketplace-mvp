export type SellerScreenId =
  | "splash"
  | "login"
  | "seller_home"
  | "seller_products"
  | "seller_product_detail"
  | "seller_orders"
  | "seller_finance"
  | "seller_analytics"
  | "seller_promotion"
  | "seller_ai_assistant"
  | "profile";

export type SellerBlueprintBlock = {
  id: string;
  title: string;
  goal: string;
  showWhen: string;
  hideWhen: string;
  apiSource: string;
  onPress: string;
};

export type SellerScreenBlueprint = {
  screenId: SellerScreenId;
  route: string;
  purpose: string;
  primaryCTA: string;
  secondaryCTA: string;
  informationHierarchy: string[];
  conversionGoal: string;
  popTelemetry: string[];
  offlineBehaviour: string;
  loading: string;
  error: string;
  emptyState: string;
  blocks?: SellerBlueprintBlock[];
};
