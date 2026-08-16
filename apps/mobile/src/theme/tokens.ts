export const colors = {
  orange: "#FF6B00",
  black: "#111111",
  white: "#FFFFFF",
  gray100: "#F5F5F5",
  gray200: "#EAEAEA",
  gray500: "#737373",
  gray900: "#171717",
  danger: "#DC2626",
  success: "#16A34A",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: "700" as const },
  subtitle: { fontSize: 16, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
};
