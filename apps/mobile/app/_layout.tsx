import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { bootMark } from "../src/boot/early-boot";
import { NetworkBanner } from "../src/components/NetworkBanner";
import { RootErrorBoundary } from "../src/components/RootErrorBoundary";
import { StartupFatalGate } from "../src/components/StartupFatalGate";
import { UpdateHost } from "../src/components/UpdateHost";
import { useDeepLinkHandler } from "../src/deep-links/use-deep-link-handler";
import { colors } from "../src/theme/tokens";

bootMark("app/_layout imports resolved");

function RootShell() {
  useDeepLinkHandler();
  return (
    <>
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
        <Stack.Screen name="build-info" options={{ title: "Build Info" }} />
        <Stack.Screen name="startup-diagnostics" options={{ title: "Startup Diagnostics" }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: "Товар" }} />
        <Stack.Screen name="cart" options={{ title: "Корзина" }} />
        <Stack.Screen name="checkout" options={{ title: "Оформление" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Заказ" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  bootMark("RootLayout render");
  return (
    <RootErrorBoundary>
      <StartupFatalGate>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <RootShell />
        </SafeAreaProvider>
      </StartupFatalGate>
    </RootErrorBoundary>
  );
}

bootMark("app/_layout module evaluated");
