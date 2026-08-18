import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../../design-system/forms/buttons";
import { CartEmptyState } from "../../design-system/components/CartEmptyState";
import { CartHeader } from "../../design-system/components/CartHeader";
import { CartLineCard } from "../../design-system/components/CartLineCard";
import { CartPriceSummary } from "../../design-system/components/CartPriceSummary";
import { CartRecommendationsRail } from "../../design-system/components/CartRecommendationsRail";
import { CartSkeleton } from "../../design-system/components/CartSkeleton";
import { CartStickyCheckoutCta } from "../../design-system/components/CartStickyCheckoutCta";
import { CartSummaryBar } from "../../design-system/components/CartSummaryBar";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { surface, text } from "../../design-system/tokens/colors";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import type { CartDataState } from "./useCartData";

const STICKY_HEIGHT = 96;

type Props = {
  state: CartDataState;
};

function currencyLabel(currency: string): string {
  return currency === "RUB" ? "₽" : currency;
}

export function CartExperience({ state }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = STICKY_HEIGHT + insets.bottom + spacing.lg;

  if (state.loading) {
    return <CartSkeleton />;
  }

  if (state.offlineBlocked) {
    return (
      <View style={[styles.offline, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="wifi-off" size={48} color={text.muted} />
        <Text style={styles.offlineTitle}>Нет подключения</Text>
        <Text style={styles.offlineBody}>Корзина доступна только онлайн. Проверьте интернет и попробуйте снова.</Text>
        <PrimaryButton label="Повторить" onPress={() => void state.refresh()} />
      </View>
    );
  }

  if (state.error && !state.cart) {
    return (
      <View style={[styles.offline, { paddingTop: insets.top + spacing["2xl"] }]}>
        <SectionErrorCard message={state.error} onRetry={() => void state.refresh()} />
      </View>
    );
  }

  const cart = state.cart;
  const currency = currencyLabel(cart?.currency ?? "RUB");
  const isEmpty = !cart || cart.items.length === 0;

  if (isEmpty) {
    return (
      <View style={styles.screen}>
        <View style={[styles.emptyHeader, { paddingTop: insets.top + spacing.md }]}>
          <CartHeader itemCount={0} onContinueShopping={() => router.push("/(tabs)/catalog")} />
        </View>
        <CartEmptyState onBrowseCatalog={() => router.push("/(tabs)/catalog")} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void state.refresh()} />}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad, paddingTop: insets.top + spacing.md }]}
      >
        <CartHeader itemCount={cart.itemCount} onContinueShopping={() => router.push("/(tabs)/catalog")} />
        <CartSummaryBar
          itemCount={cart.itemCount}
          subtotal={cart.subtotal}
          savings={cart.savings}
          currency={currency}
        />

        {state.error ? <SectionErrorCard message={state.error} onRetry={() => void state.refresh()} /> : null}

        <View style={styles.products}>
          {cart.items.map((line) => (
            <CartLineCard
              key={line.productId}
              line={line}
              currency={currency}
              isFavorite={state.favoriteIds.has(line.productId)}
              favoriteBusy={state.favoriteBusyId === line.productId}
              onOpenProduct={() => router.push(`/product/${line.productId}`)}
              onToggleFavorite={() => void state.onToggleFavorite(line.productId)}
              onRemove={() => void state.onRemove(line.productId)}
              onDecrement={() => void state.onDecrement(line.productId)}
              onIncrement={() => void state.onIncrement(line.productId)}
            />
          ))}
        </View>

        <CartRecommendationsRail
          items={state.recommendations}
          failed={state.recommendationsFailed}
          onRetry={() => void state.retryRecommendations()}
        />

        <CartPriceSummary subtotal={cart.subtotal} savings={cart.savings} currency={currency} />
      </ScrollView>

      <CartStickyCheckoutCta
        bottomInset={insets.bottom}
        subtotal={cart.subtotal}
        itemCount={cart.itemCount}
        currency={currency}
        onCheckout={() => {
          state.onCheckout();
          router.push("/checkout");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  emptyHeader: { paddingHorizontal: spacing.lg },
  products: { gap: spacing.md },
  offline: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
    backgroundColor: surface.background,
  },
  offlineTitle: { ...typography.h2, color: text.primary },
  offlineBody: { ...typography.body, color: text.secondary, textAlign: "center" },
});
