import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { fetchConversations, type ConversationListItem } from "../../src/api/endpoints";
import { EmptyState, PageContainer, SkeletonGrid } from "../../src/components/ui";
import { useMessagesBadge } from "../../src/hooks/useMessagesBadge";
import { refreshTabBadges } from "../../src/commerce/refresh-tab-badges";
import { loadAppConfig } from "../../src/config/env";
import { resolveImageUrl } from "../../src/utils/format";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function ConversationRow({ item, onPress }: { item: ConversationListItem; onPress: () => void }) {
  const config = loadAppConfig();
  const imageUrl = resolveImageUrl(item.product.imageUrl, config.apiBaseUrl);
  const preview = item.lastMessage?.text ?? "Нет сообщений";

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={styles.thumbFallbackText}>ЛОТ</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.counterpart} numberOfLines={1}>
            {item.counterpart.name}
          </Text>
          {item.lastMessage ? <Text style={styles.time}>{formatTime(item.lastMessage.createdAt)}</Text> : null}
        </View>
        <Text style={styles.productTitle} numberOfLines={1}>
          {item.product.title}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      {item.unreadCount > 0 ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function MessagesInboxScreen() {
  useMessagesBadge();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchConversations();
      setItems(res.items);
      void refreshTabBadges();
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading && items.length === 0) {
    return (
      <PageContainer style={styles.container}>
        <SkeletonGrid count={3} />
      </PageContainer>
    );
  }

  return (
    <PageContainer style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            preset="catalog"
            title="Сообщений пока нет"
            description="Задайте продавцу вопрос о товаре — переписка появится здесь."
            actionLabel="В каталог"
            onAction={() => router.push("/(tabs)/catalog")}
          />
        }
        renderItem={({ item }) => (
          <ConversationRow item={item} onPress={() => router.push(`/messages/${item.id}`)} />
        )}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.white,
  },
  thumb: { width: 48, height: 48, borderRadius: radii.sm },
  thumbFallback: { backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  thumbFallbackText: { ...typography.caption, color: colors.orange, fontWeight: "700" },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  counterpart: { ...typography.body, fontWeight: "700", color: colors.black, flex: 1 },
  time: { ...typography.caption, color: colors.gray500 },
  productTitle: { ...typography.caption, color: colors.gray700 },
  preview: { ...typography.caption, color: colors.gray500 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadText: { color: colors.white, fontSize: 11, fontWeight: "700" },
});
