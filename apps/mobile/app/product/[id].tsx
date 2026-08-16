import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { addToCart, fetchProduct, postTelemetry, toggleFavorite } from "../../src/api/endpoints";
import { useAppStore } from "../../src/store/app-store";
import { colors, spacing, typography } from "../../src/theme/tokens";

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const offline = useAppStore((s) => s.offline);
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchProduct(id)
      .then((p) => {
        setProduct(p);
        postTelemetry({ screen: "product", event: "product_opened" });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function onAddToCart() {
    if (offline) {
      setMessage("Для этого действия требуется интернет");
      return;
    }
    if (!id) return;
    await addToCart(id, 1);
    await postTelemetry({ screen: "product", event: "add_to_cart" });
    setMessage("Добавлено в корзину");
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.orange} />;
  if (!product) return <Text style={styles.empty}>Товар не найден</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{String(product.title ?? product.name ?? "Товар")}</Text>
      <Text style={styles.price}>{String(product.price ?? 0)} ₽</Text>
      <Text style={styles.body}>{String(product.description ?? "")}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <View style={styles.row}>
        <Pressable style={styles.button} onPress={onAddToCart}>
          <Text style={styles.buttonText}>В корзину</Text>
        </Pressable>
        <Pressable style={styles.buttonOutline} onPress={() => id && toggleFavorite(id)}>
          <Text style={styles.buttonOutlineText}>Избранное</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Pressable style={styles.buttonOutline} onPress={() => router.push("/cart")}>
          <Text style={styles.buttonOutlineText}>Корзина</Text>
        </Pressable>
        <Pressable
          style={styles.buttonOutline}
          onPress={() => Share.share({ message: `lot://product/${id}`, url: `lot://product/${id}` })}
        >
          <Text style={styles.buttonOutlineText}>Поделиться</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white },
  title: { ...typography.title },
  price: { ...typography.subtitle, color: colors.orange },
  body: { ...typography.body, color: colors.gray900 },
  row: { flexDirection: "row", gap: spacing.sm },
  button: { flex: 1, backgroundColor: colors.orange, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonText: { color: colors.white, ...typography.subtitle },
  buttonOutline: { flex: 1, borderWidth: 1, borderColor: colors.black, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonOutlineText: { ...typography.subtitle },
  empty: { padding: spacing.lg, textAlign: "center" },
  message: { color: colors.orange, ...typography.caption },
});
