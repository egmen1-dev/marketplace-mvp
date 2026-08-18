import { useLocalSearchParams } from "expo-router";

import { OrderDetailExperience } from "../../src/features/orders/OrderDetailExperience";
import { useOrderDetailData } from "../../src/features/orders/useOrderDetailData";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useOrderDetailData(typeof id === "string" ? id : undefined);
  return <OrderDetailExperience state={state} />;
}
