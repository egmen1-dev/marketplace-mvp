import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { setSessionClearedHandler, warmSessionFromStorage } from "../src/api/client";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { NetworkBanner } from "../src/components/NetworkBanner";
import { UpdateHost } from "../src/components/UpdateHost";
import { CommerceToastHost } from "../src/components/CommerceToastHost";
import { BetaBanner, ObservabilityProvider } from "../src/beta";
import { useDeepLinkHandler } from "../src/deep-links/use-deep-link-handler";
import { useCheckoutReturnRefresh } from "../src/hooks/useCheckoutReturnRefresh";
import { useWebHandoffSessionRefresh } from "../src/hooks/useWebHandoffSessionRefresh";
import { colors } from "../src/theme/tokens";

function SessionGuard() {
  useEffect(() => {
    void warmSessionFromStorage();
    setSessionClearedHandler(() => {
      router.replace("/login");
    });
    return () => setSessionClearedHandler(null);
  }, []);
  return null;
}

function RootShell() {
  useDeepLinkHandler();
  useCheckoutReturnRefresh();
  useWebHandoffSessionRefresh();
  return (
  <ObservabilityProvider>
    <>
      <SessionGuard />
      <BetaBanner />
      <NetworkBanner />
      <CommerceToastHost />
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
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="seller/[id]" options={{ title: "Продавец" }} />
        <Stack.Screen name="cart" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ title: "Заказ" }} />
        <Stack.Screen name="feedback" options={{ title: "Обратная связь" }} />
        <Stack.Screen name="about" options={{ title: "О приложении" }} />
        <Stack.Screen name="update" options={{ title: "Проверить обновление" }} />
        <Stack.Screen name="messages" options={{ headerShown: false }} />
        <Stack.Screen name="sell" options={{ headerShown: false }} />
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
