/** Screen registry for design review — buyer baseline pack + seller readiness */

export type DesignReviewScreenId =
  | "login"
  | "buyer_home"
  | "catalog"
  | "pdp"
  | "cart"
  | "checkout"
  | "orders"
  | "favorites"
  | "profile"
  | "seller_home"
  | "seller_product_card"
  | "seller_kpi_card"
  | "seller_priority_block";

export type DesignReviewScreenDefinition = {
  id: DesignReviewScreenId;
  label: string;
  journey: "buyer" | "seller" | "shared";
  sourceFiles: string[];
  baselineFile: string;
  requiresPhysicalEvidence: boolean;
  sellerReadiness?: boolean;
};

export const BUYER_BASELINE_SCREENS: DesignReviewScreenDefinition[] = [
  {
    id: "login",
    label: "Login",
    journey: "shared",
    sourceFiles: ["apps/mobile/app/login.tsx"],
    baselineFile: "login.png",
    requiresPhysicalEvidence: true,
  },
  {
    id: "buyer_home",
    label: "Buyer Home",
    journey: "buyer",
    sourceFiles: ["apps/mobile/app/(tabs)/index.tsx", "apps/mobile/src/features/buyer-home/BuyerHomeExperience.tsx"],
    baselineFile: "buyer-home.png",
    requiresPhysicalEvidence: true,
  },
  {
    id: "catalog",
    label: "Catalog",
    journey: "buyer",
    sourceFiles: ["apps/mobile/app/(tabs)/catalog.tsx", "apps/mobile/src/features/catalog-discovery/CatalogDiscoveryExperience.tsx"],
    baselineFile: "catalog.png",
    requiresPhysicalEvidence: true,
  },
  {
    id: "pdp",
    label: "PDP",
    journey: "buyer",
    sourceFiles: ["apps/mobile/app/product/[id].tsx", "apps/mobile/src/features/product-detail/ProductDetailExperience.tsx"],
    baselineFile: "pdp.png",
    requiresPhysicalEvidence: true,
  },
  {
    id: "cart",
    label: "Cart",
    journey: "buyer",
    sourceFiles: ["apps/mobile/app/cart.tsx", "apps/mobile/src/features/cart-checkout/CartExperience.tsx"],
    baselineFile: "cart.png",
    requiresPhysicalEvidence: true,
  },
  {
    id: "checkout",
    label: "Checkout",
    journey: "buyer",
    sourceFiles: ["apps/mobile/app/checkout.tsx", "apps/mobile/src/features/cart-checkout/CheckoutExperience.tsx"],
    baselineFile: "checkout.png",
    requiresPhysicalEvidence: true,
  },
  {
    id: "orders",
    label: "Orders",
    journey: "buyer",
    sourceFiles: ["apps/mobile/app/(tabs)/orders.tsx", "apps/mobile/src/features/orders/OrdersExperience.tsx"],
    baselineFile: "orders.png",
    requiresPhysicalEvidence: true,
  },
  {
    id: "favorites",
    label: "Favorites",
    journey: "buyer",
    sourceFiles: ["apps/mobile/app/(tabs)/favorites.tsx"],
    baselineFile: "favorites.png",
    requiresPhysicalEvidence: true,
  },
  {
    id: "profile",
    label: "Profile",
    journey: "shared",
    sourceFiles: ["apps/mobile/app/(tabs)/profile.tsx", "apps/mobile/src/features/profile/ProfileExperience.tsx"],
    baselineFile: "profile.png",
    requiresPhysicalEvidence: true,
  },
];

export const SELLER_READINESS_SCREENS: DesignReviewScreenDefinition[] = [
  {
    id: "seller_home",
    label: "Seller Home",
    journey: "seller",
    sourceFiles: ["apps/mobile/app/(tabs)/seller-home.tsx"],
    baselineFile: "seller-home.png",
    requiresPhysicalEvidence: true,
    sellerReadiness: true,
  },
  {
    id: "seller_product_card",
    label: "Seller Product Card",
    journey: "seller",
    sourceFiles: ["apps/mobile/app/(tabs)/seller-products.tsx", "apps/mobile/src/components/ui/SellerProductCard.tsx"],
    baselineFile: "seller-product-card.png",
    requiresPhysicalEvidence: true,
    sellerReadiness: true,
  },
  {
    id: "seller_kpi_card",
    label: "Seller KPI Card",
    journey: "seller",
    sourceFiles: ["apps/mobile/app/(tabs)/seller-home.tsx", "apps/mobile/src/components/ui/cards.tsx"],
    baselineFile: "seller-kpi-card.png",
    requiresPhysicalEvidence: true,
    sellerReadiness: true,
  },
  {
    id: "seller_priority_block",
    label: "Seller Priority Block",
    journey: "seller",
    sourceFiles: ["apps/mobile/app/(tabs)/seller-home.tsx"],
    baselineFile: "seller-priority-block.png",
    requiresPhysicalEvidence: true,
    sellerReadiness: true,
  },
];

export const ALL_DESIGN_REVIEW_SCREENS: DesignReviewScreenDefinition[] = [
  ...BUYER_BASELINE_SCREENS,
  ...SELLER_READINESS_SCREENS,
];

export function getScreenDefinition(id: string): DesignReviewScreenDefinition | undefined {
  return ALL_DESIGN_REVIEW_SCREENS.find((s) => s.id === id);
}
