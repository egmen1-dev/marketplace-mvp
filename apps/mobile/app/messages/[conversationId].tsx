import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fetchConversation,
  fetchConversationMessages,
  markConversationRead,
  sendConversationMessage,
  type ChatMessage,
  type ConversationDetail,
} from "../../src/api/endpoints";
import { PrimaryButton, SkeletonGrid } from "../../src/components/ui";
import { refreshTabBadges } from "../../src/commerce/refresh-tab-badges";
import { loadAppConfig } from "../../src/config/env";
import { getSessionMeta } from "../../src/storage/secure-session";
import { resolveImageUrl } from "../../src/utils/format";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  if (message.type !== "TEXT") {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.bubbleWrap, isMine ? styles.bubbleMineWrap : styles.bubbleTheirWrap]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheir]}>
        <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : null]}>{message.text}</Text>
        <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : null]}>{formatMessageTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const insets = useSafeAreaInsets();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const config = loadAppConfig();

  useEffect(() => {
    void getSessionMeta().then((meta) => setCurrentUserId(meta?.userId ?? null));
  }, []);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const [conv, page] = await Promise.all([
        fetchConversation(conversationId),
        fetchConversationMessages(conversationId),
      ]);
      setDetail(conv);
      setMessages(page.items.length > 0 ? page.items : conv.messages);
      await markConversationRead(conversationId);
      void refreshTabBadges();
    } catch {
      setError("Не удалось загрузить переписку");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (conversationId) {
        void markConversationRead(conversationId).then(() => refreshTabBadges());
      }
    }, [conversationId]),
  );

  async function onSend() {
    if (!conversationId || !draft.trim() || sending) return;
    const text = draft.trim();
    setSending(true);
    setError(null);
    try {
      const res = await sendConversationMessage(conversationId, text);
      setMessages((prev) => [...prev, res.message]);
      setDraft("");
      void refreshTabBadges();
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch {
      setError("Не удалось отправить сообщение. Попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  }

  if (loading && !detail) {
    return (
      <View style={styles.loading}>
        <SkeletonGrid count={2} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>{error ?? "Диалог не найден"}</Text>
      </View>
    );
  }

  const productImage = resolveImageUrl(detail.product.imageUrl, config.apiBaseUrl);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top + 56}
    >
      <Pressable
        style={styles.productContext}
        onPress={() => router.push(`/product/${detail.product.id}`)}
        accessibilityRole="button"
      >
        {productImage ? (
          <Image source={{ uri: productImage }} style={styles.productThumb} contentFit="cover" />
        ) : (
          <View style={[styles.productThumb, styles.productThumbFallback]} />
        )}
        <View style={styles.productText}>
          <Text style={styles.productName} numberOfLines={1}>
            {detail.product.title}
          </Text>
          <Text style={styles.productPrice}>
            {detail.product.price.toLocaleString("ru-RU")} {detail.product.currency}
          </Text>
        </View>
      </Pressable>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <MessageBubble message={item} isMine={Boolean(currentUserId && item.senderId === currentUserId)} />
        )}
      />

      {error ? <Text style={styles.sendError}>{error}</Text> : null}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TextInput
          style={styles.input}
          placeholder="Введите сообщение..."
          placeholderTextColor={colors.gray500}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={4000}
        />
        <PrimaryButton label={sending ? "…" : "Отправить"} onPress={onSend} disabled={!draft.trim() || sending} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray100 },
  loading: { flex: 1, padding: spacing.lg },
  errorText: { ...typography.body, color: colors.danger, textAlign: "center" },
  productContext: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  productThumb: { width: 40, height: 40, borderRadius: radii.sm },
  productThumbFallback: { backgroundColor: colors.gray200 },
  productText: { flex: 1 },
  productName: { ...typography.body, fontWeight: "600", color: colors.black },
  productPrice: { ...typography.caption, color: colors.gray700 },
  messages: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  systemWrap: { alignItems: "center", paddingVertical: spacing.xs },
  systemText: { ...typography.caption, color: colors.gray500, textAlign: "center" },
  bubbleWrap: { maxWidth: "82%" },
  bubbleMineWrap: { alignSelf: "flex-end" },
  bubbleTheirWrap: { alignSelf: "flex-start" },
  bubble: { borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4 },
  bubbleMine: { backgroundColor: colors.orange },
  bubbleTheir: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  bubbleText: { ...typography.body, color: colors.black },
  bubbleTextMine: { color: colors.white },
  bubbleTime: { ...typography.caption, color: colors.gray500, fontSize: 10 },
  bubbleTimeMine: { color: "rgba(255,255,255,0.8)" },
  sendError: { ...typography.caption, color: colors.danger, textAlign: "center", paddingHorizontal: spacing.lg },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.black,
    backgroundColor: colors.gray100,
  },
});
