import { CheckoutExperience } from "../src/features/cart-checkout/CheckoutExperience";
import { useCheckoutData } from "../src/features/cart-checkout/useCheckoutData";

export default function CheckoutScreen() {
  const state = useCheckoutData();
  return <CheckoutExperience state={state} />;
}
