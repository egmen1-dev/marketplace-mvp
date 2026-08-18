import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../../src/design-system/forms/buttons";
import { PdpSellerCard } from "../../src/design-system/components/PdpSellerCard";
import { CatalogDiscoveryExperience } from "../../src/features/catalog-discovery/CatalogDiscoveryExperience";
import { useCatalogDiscovery } from "../../src/features/catalog-discovery/useCatalogDiscovery";
import { useSellerCatalogProfile } from "../../src/features/seller-catalog/useSellerCatalogProfile";
import { surface, text } from "../../src/design-system/tokens/colors";
import { spacing } from "../../src/design-system/tokens/spacing";
import { typography } from "../../src/design-system/tokens/typography";
import type { ProductSeller } from "../../src/features/product-detail/types";

export default function SellerCatalogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sellerId = typeof id === "string" ? id : undefined;
  const insets = useSafeAreaInsets();
  const profileState = useSellerCatalogProfile(sellerId);
  const catalogState = useCatalogDiscovery("", null, sellerId ?? null);

  if (profileState.loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="storefront-outline" size={48} color={text.muted} />
        <Text style={styles.title}>Загрузка продавца…</Text>
      </View>
    );
  }

  if (profileState.offline && !profileState.profile) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="wifi-off" size={48} color={text.muted} />
        <Text style={styles.title}>Нет подключения</Text>
        <Text style={styles.body}>Профиль продавца и каталог недоступны офлайн.</Text>
        <PrimaryButton label="Повторить" onPress={() => void profileState.refresh()} />
      </View>
    );
  }

  if (profileState.notFound || !profileState.profile) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="store-remove-outline" size={48} color={text.muted} />
        <Text style={styles.title}>Продавец не найден</Text>
        <Text style={styles.body}>Магазин удалён или недоступен.</Text>
        <PrimaryButton label="В каталог" onPress={() => router.replace("/(tabs)/catalog")} />
      </View>
    );
  }

  if (profileState.error) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={text.muted} />
        <Text style={styles.title}>Ошибка загрузки</Text>
        <Text style={styles.body}>{profileState.error}</Text>
        <PrimaryButton label="Повторить" onPress={() => void profileState.refresh()} />
      </View>
    );
  }

  const seller: ProductSeller = {
    id: profileState.profile.id,
    storeName: profileState.profile.storeName,
    slug: profileState.profile.slug ?? undefined,
    isVerified: profileState.profile.isVerified,
    productCount: profileState.profile.productCount,
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <PdpSellerCard seller={seller} />
        {profileState.profile.description ? (
          <Text style={styles.description}>{profileState.profile.description}</Text>
        ) : null}
        <Text style={styles.sectionTitle}>Товары продавца</Text>
      </View>
      <View style={styles.catalog}>
        <CatalogDiscoveryExperience state={catalogState} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.background },
  header: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
  catalog: { flex: 1 },
  description: { ...typography.body, color: text.secondary },
  sectionTitle: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
    backgroundColor: surface.background,
  },
  title: { ...typography.h2, color: text.primary },
  body: { ...typography.body, color: text.secondary, textAlign: "center" },
});
