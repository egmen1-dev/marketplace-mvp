import { SellerWorkspaceExperience } from "../../src/features/seller/SellerWorkspaceExperience";
import { useSellerHomeData } from "../../src/features/seller/useSellerHomeData";

export default function SellerHomeScreen() {
  const state = useSellerHomeData();
  return <SellerWorkspaceExperience state={state} />;
}
