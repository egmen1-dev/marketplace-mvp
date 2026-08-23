import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { setSessionClearedHandler } from "../src/api/client";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { NetworkBanner } from "../src/components/NetworkBanner";
import { UpdateHost } from "../src/components/UpdateHost";
import { BetaBanner, ObservabilityProvider } from "../src/beta";
import { useDeepLinkHandler } from "../src/deep-links/use-deep-link-handler";
import { colors } from "../src/theme/tokens";

function SessionGuard() {
  useEffect(() => {
    setSessionClearedHandler(() => {
      router.replace("/login");
    });
    return () => setSessionClearedHandler(null);
  }, []);
  return null;
}

function RootShell() {
  useDeepLinkHandler();
  return (
  <ObservabilityProvider>
    <>
      <SessionGuard />
      <BetaBanner />
      <NetworkBanner />
      <UpdateHost />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.black,
          contentStyle: { backgroundColor: colors.white },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: "Товар" }} />
        <Stack.Screen name="cart" options={{ title: "Корзина" }} />
        <Stack.Screen name="checkout" options={{ title: "Оформление" }} />
        <Stack.Screen name="feedback" options={{ title: "Обратная связь" }} />
      </Stack>
    </>
  </ObservabilityProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <RootShell />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
