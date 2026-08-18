import { SellerProductsExperience } from "../../src/features/seller/SellerProductsExperience";
import { useSellerProductsData } from "../../src/features/seller/useSellerProductsData";

export default function SellerProductsScreen() {
  const state = useSellerProductsData();
  return <SellerProductsExperience state={state} />;
}
