import { OrdersExperience } from "../../src/features/orders/OrdersExperience";
import { useOrdersData } from "../../src/features/orders/useOrdersData";

export default function OrdersScreen() {
  const state = useOrdersData();
  return <OrdersExperience state={state} />;
}
