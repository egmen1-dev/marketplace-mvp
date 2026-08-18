import { SellerHomeExperience } from "../../src/features/seller/SellerHomeExperience";
import { useSellerHomeData } from "../../src/features/seller/useSellerHomeData";

export default function SellerHomeScreen() {
  const state = useSellerHomeData();
  return <SellerHomeExperience state={state} />;
}
