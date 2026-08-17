import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Suspense, lazy, useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { bootMark, bootStage } from "../src/boot/early-boot";
import { isBootModuleEnabled } from "../src/boot/boot-isolation";
import type { PreviousCrashRecord } from "../src/boot/previous-crash";
import { RootErrorBoundary } from "../src/components/RootErrorBoundary";
import { StartupFatalGate } from "../src/components/StartupFatalGate";
import { PreviousCrashNotice } from "../src/components/PreviousCrashNotice";
import { useDeepLinkHandler } from "../src/deep-links/use-deep-link-handler";
import { useAppStore } from "../src/store/app-store";
import { colors } from "../src/theme/tokens";

bootStage("ROOT_LAYOUT_INIT");
bootMark("app/_layout imports resolved");

const LazyNetworkBanner = lazy(() =>
  import("../src/components/NetworkBanner").then((m) => ({ default: m.NetworkBanner })),
);
const LazyUpdateHost = lazy(() =>
  import("../src/components/UpdateHost").then((m) => ({ default: m.UpdateHost })),
);

function DeferredProviders() {
  const bootstrapped = useAppStore((s) => s.bootstrapped);
  const showNetwork = bootstrapped && isBootModuleEnabled("network");
  const showUpdate = bootstrapped && isBootModuleEnabled("update");

  return (
    <>
      {showNetwork ? (
        <Suspense fallback={null}>
          <LazyNetworkBanner />
        </Suspense>
      ) : null}
      {showUpdate ? (
        <Suspense fallback={null}>
          <LazyUpdateHost />
        </Suspense>
      ) : null}
    </>
  );
}

function RootShell() {
  const bootstrapped = useAppStore((s) => s.bootstrapped);
  useDeepLinkHandler(bootstrapped);
  const [previousCrash, setPreviousCrash] = useState<PreviousCrashRecord | null>(null);

  useEffect(() => {
    if (!isBootModuleEnabled("diagnostics")) return;
    void import("../src/boot/previous-crash").then(({ loadPreviousCrash }) => loadPreviousCrash().then(setPreviousCrash));
  }, []);

  return (
    <>
      {previousCrash ? (
        <PreviousCrashNotice record={previousCrash} onDismiss={() => setPreviousCrash(null)} />
      ) : null}
      <DeferredProviders />
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
  bootStage("PROVIDERS_INIT");
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
