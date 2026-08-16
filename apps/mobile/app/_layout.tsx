import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { NetworkBanner } from "../src/components/NetworkBanner";
import { useDeepLinkHandler } from "../src/deep-links/use-deep-link-handler";
import { colors } from "../src/theme/tokens";

function RootShell() {
  useDeepLinkHandler();
  return (
    <>
      <NetworkBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.black,
          contentStyle: { backgroundColor: colors.white },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Вход" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: "Товар" }} />
        <Stack.Screen name="cart" options={{ title: "Корзина" }} />
        <Stack.Screen name="checkout" options={{ title: "Оформление" }} />
      </Stack>
    </>
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
