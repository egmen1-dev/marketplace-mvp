/** Typography scale — manual font sizes forbidden outside this module (EPIC 84) */

import type { TextStyle } from "react-native";

function t(partial: TextStyle): TextStyle {
  return partial;
}

export const typography = {
  display: t({ fontSize: 28, fontWeight: "700", lineHeight: 34, letterSpacing: -0.3 }),
  h1: t({ fontSize: 22, fontWeight: "700", lineHeight: 28, letterSpacing: -0.2 }),
  h2: t({ fontSize: 18, fontWeight: "600", lineHeight: 24 }),
  h3: t({ fontSize: 16, fontWeight: "600", lineHeight: 22 }),
  body: t({ fontSize: 15, fontWeight: "400", lineHeight: 22 }),
  bodySmall: t({ fontSize: 13, fontWeight: "400", lineHeight: 18 }),
  caption: t({ fontSize: 13, fontWeight: "400", lineHeight: 18 }),
  button: t({ fontSize: 15, fontWeight: "600", lineHeight: 20 }),
  buttonSm: t({ fontSize: 13, fontWeight: "600", lineHeight: 18 }),
  price: t({ fontSize: 20, fontWeight: "700", lineHeight: 26, letterSpacing: -0.2 }),
  priceLarge: t({ fontSize: 28, fontWeight: "700", lineHeight: 34, letterSpacing: -0.3 }),
  badge: t({ fontSize: 11, fontWeight: "600", lineHeight: 14, letterSpacing: 0.2 }),
  /** @deprecated use h1 */
  title: t({ fontSize: 22, fontWeight: "700", lineHeight: 28 }),
  /** @deprecated use h2 */
  subtitle: t({ fontSize: 18, fontWeight: "600", lineHeight: 24 }),
} as const;

export type TypographyToken = keyof typeof typography;

export const TYPOGRAPHY_SCALE: TypographyToken[] = [
  "display",
  "h1",
  "h2",
  "h3",
  "body",
  "bodySmall",
  "caption",
  "button",
  "price",
  "badge",
];
