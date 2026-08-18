import { SellerIntelligenceExperience } from "../../src/features/seller/SellerIntelligenceExperience";
import { useSellerIntelligenceData } from "../../src/features/seller/intelligence/useSellerIntelligenceData";

export default function SellerIntelligenceScreen() {
  const state = useSellerIntelligenceData();
  return <SellerIntelligenceExperience state={state} />;
}
