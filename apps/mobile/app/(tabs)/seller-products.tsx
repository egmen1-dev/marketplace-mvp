import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";

import { fetchSellerProducts, type MobileProductListItem } from "../../src/api/endpoints";
import { EmptyState, ErrorState, LoadingState, PageScroll, SearchBar, SellerProductRow } from "../../src/components/ui";
import { loadAppConfig } from "../../src/config/env";
import { resolveImageUrl } from "../../src/utils/format";
import { useAppStore } from "../../src/store/app-store";

export default function SellerProductsScreen() {
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (offline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSellerProducts();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить товары");
    } finally {
      setLoading(false);
    }
  }, [offline]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const config = loadAppConfig();
  const filtered = query
    ? items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
    : items;

  if (!sellerCapable) {
    return (
      <EmptyState
        title="Нет доступа к товарам"
        description="Войдите под аккаунтом продавца, чтобы управлять товарами."
        actionLabel="В профиль"
        onAction={() => router.push("/(tabs)/profile")}
      />
    );
  }

  if (loading && items.length === 0) return <LoadingState label="Загружаем товары…" />;
  if (error && items.length === 0) return <ErrorState title="Ошибка загрузки" description={error} onRetry={load} />;

  return (
    <PageScroll refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <SearchBar placeholder="Поиск по вашим товарам" value={query} onChangeText={setQuery} />
      {filtered.length === 0 ? (
        <EmptyState
          title="Нет товаров"
          description="Создайте первый товар в веб-кабинете продавца."
          actionLabel="Обновить"
          onAction={load}
        />
      ) : (
        filtered.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/product/${item.id}`)}>
            <SellerProductRow
              title={item.title}
              price={item.price}
              stock={item.stock ?? 0}
              status={item.status ?? "ACTIVE"}
              imageUrl={resolveImageUrl(item.primaryImage?.url ?? null, config.apiBaseUrl)}
            />
          </Pressable>
        ))
      )}
    </PageScroll>
  );
}
