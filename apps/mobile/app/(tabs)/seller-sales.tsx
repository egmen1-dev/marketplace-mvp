import { SellerSalesExperience } from "../../src/features/seller-sales/SellerSalesExperience";
import { useSellerSalesData } from "../../src/features/seller-sales/useSellerSalesData";

export default function SellerSalesScreen() {
  const state = useSellerSalesData();
  return <SellerSalesExperience state={state} />;
}
