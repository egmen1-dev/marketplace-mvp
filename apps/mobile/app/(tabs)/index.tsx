import { BuyerHomeExperience } from "../../src/features/buyer-home/BuyerHomeExperience";
import { useBuyerHomeData } from "../../src/features/buyer-home/useBuyerHomeData";

export default function BuyerHomeScreen() {
  const data = useBuyerHomeData();
  return <BuyerHomeExperience {...data} />;
}
