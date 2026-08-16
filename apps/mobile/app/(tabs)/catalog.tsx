import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchCatalog } from "../../src/api/endpoints";
import { colors, spacing, typography } from "../../src/theme/tokens";

type Item = { id?: string; title?: string; price?: number };

export default function CatalogScreen() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const res = await fetchCatalog({ q, cursor: reset ? null : cursor });
      setItems((prev) => (reset ? (res.items as Item[]) : [...prev, ...(res.items as Item[])]));
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } finally {
      setLoading(false);
    }
  }, [q, cursor]);

  useEffect(() => {
    load(true);
  }, [q]);

  return (
    <View style={styles.container}>
      <TextInput placeholder="Поиск" value={q} onChangeText={setQ} style={styles.search} />
      {loading && items.length === 0 ? <ActivityIndicator color={colors.orange} /> : null}
      <FlatList
        data={items}
        keyExtractor={(item, idx) => item.id ?? String(idx)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(true)} />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => item.id && router.push(`/product/${item.id}`)}>
            <Text style={styles.title}>{item.title ?? "Товар"}</Text>
            <Text style={styles.price}>{item.price ?? 0} ₽</Text>
          </Pressable>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Ничего не найдено</Text> : null}
        onEndReached={() => hasMore && !loading && load(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: spacing.md },
  search: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: 12, marginBottom: spacing.sm, minHeight: 48 },
  card: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray200, minHeight: 64 },
  title: { ...typography.subtitle, color: colors.black },
  price: { ...typography.body, color: colors.orange, marginTop: 4 },
  empty: { textAlign: "center", color: colors.gray500, marginTop: spacing.lg },
});
