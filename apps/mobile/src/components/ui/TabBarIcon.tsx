import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ColorValue } from "react-native";

import { colors } from "../../theme/tokens";

export type TabIconName =
  | "home"
  | "catalog"
  | "favorites"
  | "orders"
  | "seller-home"
  | "seller-products"
  | "seller-sales"
  | "wallet"
  | "profile";

const ICONS: Record<TabIconName, { active: keyof typeof MaterialCommunityIcons.glyphMap; inactive: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  home: { active: "home", inactive: "home-outline" },
  catalog: { active: "view-grid", inactive: "view-grid-outline" },
  favorites: { active: "heart", inactive: "heart-outline" },
  orders: { active: "package-variant-closed", inactive: "package-variant" },
  "seller-home": { active: "store", inactive: "store-outline" },
  "seller-products": { active: "tag", inactive: "tag-outline" },
  "seller-sales": { active: "chart-line", inactive: "chart-line-variant" },
  wallet: { active: "wallet", inactive: "wallet-outline" },
  profile: { active: "account-circle", inactive: "account-circle-outline" },
};

export function TabBarIcon({
  name,
  color,
  size = 22,
  focused,
  disabled,
}: {
  name: TabIconName;
  color: ColorValue;
  size?: number;
  focused?: boolean;
  disabled?: boolean;
}) {
  const icon = ICONS[name];
  const glyph = focused ? icon.active : icon.inactive;
  return (
    <MaterialCommunityIcons
      name={glyph}
      size={size}
      color={disabled ? colors.gray300 : color}
    />
  );
}
