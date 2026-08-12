import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope, Unbounded } from "next/font/google";
import { Suspense, type ReactNode } from "react";

import { AuthGateToast } from "@/components/layout/auth-gate-toast";
import { BootSplash } from "@/components/layout/boot-splash";
import { PageLoadRoot } from "@/components/layout/page-load-root";
import { AnalyticsRoot } from "@/components/analytics";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `#boot-splash{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#fff;color:#111}.boot-splash-inner{display:flex;flex-direction:column;align-items:center;gap:.75rem}.boot-splash-spinner{width:2.5rem;height:2.5rem;border-radius:9999px;border:3px solid rgba(255,106,0,.25);border-top-color:#ff6a00;animation:boot-spin .7s linear infinite}@keyframes boot-spin{to{transform:rotate(360deg)}}.webview-compat .animate-fade-up,.webview-compat .animate-fade-in{animation:none!important;opacity:1!important;transform:none!important}`,
          }}
        />
      </head>
      <body
        className={`${manrope.variable} ${unbounded.variable} ${geistMono.variable} flex min-h-screen flex-col font-sans antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var ua=navigator.userAgent||'';if(/VKAndroidApp|VKClient|VK\\/|Telegram|Instagram|FBAN|FBAV|Line\\/|Twitter/i.test(ua)){document.documentElement.classList.add('webview-compat');}}catch(e){}})();",
          }}
        />
        <BootSplash />
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
              <PageLoadRoot />
              <AnalyticsRoot />
              <Toaster />
            </FavoritesProvider>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
