import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GhostButton, PrimaryButton } from "../../components/ui";
import { CheckoutCommentSection } from "../../design-system/components/CheckoutCommentSection";
import { CheckoutContactSection } from "../../design-system/components/CheckoutContactSection";
import { CheckoutDeliverySection } from "../../design-system/components/CheckoutDeliverySection";
import { CheckoutOrderSummary } from "../../design-system/components/CheckoutOrderSummary";
import { CheckoutPaymentSection } from "../../design-system/components/CheckoutPaymentSection";
import { CheckoutRecipientSection } from "../../design-system/components/CheckoutRecipientSection";
import { CheckoutSkeleton } from "../../design-system/components/CheckoutSkeleton";
import { PrimaryCTA } from "../../design-system/components/PrimaryCTA";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { brand, semantic, surface, text } from "../../design-system/tokens/colors";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import type { CheckoutDataState } from "./useCheckoutData";

const STICKY_HEIGHT = 88;

type Props = {
  state: CheckoutDataState;
};

export function CheckoutExperience({ state }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = STICKY_HEIGHT + insets.bottom + spacing.lg;

  if (state.loading) {
    return <CheckoutSkeleton />;
  }

  if (state.offlineBlocked) {
    return (
      <View style={[styles.offline, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="wifi-off" size={48} color={text.muted} />
        <Text style={styles.offlineTitle}>Нет подключения</Text>
        <Text style={styles.offlineBody}>Оформление заказа доступно только онлайн.</Text>
        <PrimaryButton label="Повторить" onPress={() => void state.refresh()} />
      </View>
    );
  }

  if (state.cartError || !state.cart || state.cart.items.length === 0) {
    return (
      <View style={[styles.offline, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="cart-off" size={48} color={text.muted} />
        <Text style={styles.offlineTitle}>Корзина пуста</Text>
        {state.cartError ? <Text style={styles.offlineBody}>{state.cartError}</Text> : null}
        <PrimaryButton label="В корзину" onPress={() => router.push("/cart")} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad, paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title} accessibilityRole="header">
          Оформление заказа
        </Text>

        <CheckoutContactSection
          value={state.form.contact}
          errors={{ phone: state.fieldErrors.phone, email: state.fieldErrors.email }}
          onChange={state.setContact}
        />
        <CheckoutRecipientSection
          value={state.form.recipient}
          errors={{ fullName: state.fieldErrors.fullName }}
          onChange={state.setRecipient}
        />
        <CheckoutDeliverySection
          value={state.form.delivery}
          errors={{ city: state.fieldErrors.city, pickupPointCode: state.fieldErrors.pickupPointCode }}
          quote={state.quote}
          quoteLoading={state.quoteLoading}
          quoteError={state.quoteError}
          points={state.points}
          pointsLoading={state.pointsLoading}
          pointsError={state.pointsError}
          onChange={state.setDelivery}
          onRetryQuote={() => void state.retryQuote()}
          onRetryPoints={() => void state.retryPoints()}
        />
        <CheckoutPaymentSection
          method={state.form.paymentMethod}
          walletEnabled={state.walletEnabled}
          walletSpendable={state.walletSpendable}
          orderTotal={state.summary.orderTotal}
          error={state.fieldErrors.payment}
          onChange={state.setPaymentMethod}
        />
        <CheckoutCommentSection value={state.form.comment} onChange={state.setComment} />
        <CheckoutOrderSummary items={state.cart.items} summary={state.summary} />

        {state.alphaState?.visible ? (
          <View style={styles.alphaCard} accessibilityRole="alert">
            <MaterialCommunityIcons name="information-outline" size={22} color={semantic.info} />
            <View style={styles.alphaBody}>
              <Text style={styles.alphaTitle}>Создание заказа в приложении — Alpha</Text>
              <Text style={styles.alphaText}>
                Мы проверили ваши данные. Создание заказа из мобильного приложения будет в следующем релизе — без имитации оплаты и доставки.
              </Text>
              <PrimaryButton label="Продолжить на сайте" onPress={state.openWebCheckout} />
              <GhostButton label="Вернуться в корзину" onPress={() => router.push("/cart")} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {!state.alphaState?.visible ? (
        <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <PrimaryCTA
            label="Подтвердить заказ"
            fullWidth
            loading={state.submitting}
            success={state.submitSuccess}
            onPress={() => void state.submit()}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  title: { ...typography.h1, color: text.primary },
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
  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EAEAEA",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  alphaCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: semantic.infoSoft,
    borderWidth: 1,
    borderColor: brand.primarySoft,
  },
  alphaBody: { flex: 1, gap: spacing.sm },
  alphaTitle: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  alphaText: { ...typography.bodySmall, color: text.secondary, lineHeight: 20 },
});
