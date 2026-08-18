import { useLocalSearchParams } from "expo-router";

import { ProductDetailExperience } from "../../src/features/product-detail/ProductDetailExperience";
import { useProductDetailData } from "../../src/features/product-detail/useProductDetailData";

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useProductDetailData(typeof id === "string" ? id : undefined);

  return <ProductDetailExperience state={state} />;
}
