import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope, Unbounded } from "next/font/google";
import { Suspense, type ReactNode } from "react";

import { AuthGateToast } from "@/components/layout/auth-gate-toast";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { ThemeProvider } from "@/components/theme";
import { Toaster } from "@/components/ui/sonner";
import { getSessionUser } from "@/features/auth";
import { CartProvider } from "@/features/cart/components";
import { FavoritesProvider } from "@/features/favorites/components/favorites-provider";
import { APP_NAME } from "@/lib/constants";
import { getCanonicalAppUrl } from "@/lib/env";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["400", "500", "600"],
  adjustFontFallback: true,
  preload: true,
});

/** Heading face — not preloaded so LCP text can paint on Manrope fallback first. */
const unbounded = Unbounded({
  variable: "--font-heading",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["500", "600"],
  adjustFontFallback: true,
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

const appUrl = getCanonicalAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${APP_NAME} — маркетплейс`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Покупайте и продавайте товары удобно — каталог, корзина, безопасная оплата и доставка СДЭК.",
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: APP_NAME,
    title: `${APP_NAME} — маркетплейс`,
    description:
      "Покупайте и продавайте товары удобно — каталог, корзина, безопасная оплата и доставка СДЭК.",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — маркетплейс`,
    description:
      "Покупайте и продавайте товары удобно — каталог, корзина, безопасная оплата и доставка СДЭК.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Explicit mobile viewport (HOTFIX-UX-001 #6/#7). Ensures correct scaling on
 * Android/iOS, allows user zoom (accessibility), and extends under notches.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${unbounded.variable} ${geistMono.variable} flex min-h-screen flex-col font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="theme"
          disableTransitionOnChange={false}
        >
          <CartProvider isAuthenticated={Boolean(user)}>
            <FavoritesProvider isAuthenticated={Boolean(user)}>
              <SiteHeader user={user} />
              <main className="flex-1">{children}</main>
              <SiteFooter />
              <Suspense fallback={null}>
                <AuthGateToast />
              </Suspense>
              <Toaster />
            </FavoritesProvider>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
