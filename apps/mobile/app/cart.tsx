import { CartExperience } from "../src/features/cart-checkout/CartExperience";
import { useCartData } from "../src/features/cart-checkout/useCartData";

export default function CartScreen() {
  const state = useCartData();
  return <CartExperience state={state} />;
}
