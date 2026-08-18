import { Image } from "expo-image";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { border, surface, text } from "../../../design-system/tokens/colors";
import { layout } from "../../../design-system/tokens/layout";
import { radii } from "../../../design-system/tokens/radius";
import { spacing } from "../../../design-system/tokens/spacing";
import { typography } from "../../../design-system/tokens/typography";
import type { SellerProductEditorImage } from "../../../domain/contracts/entities/seller";

type Props = {
  images: SellerProductEditorImage[];
  uploading: boolean;
  error?: string | null;
  onAdd: () => void;
  onRemove: (url: string) => void;
  onSetPrimary: (url: string) => void;
};

export function ProductEditorGallery({ images, uploading, error, onAdd, onRemove, onSetPrimary }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Галерея</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {images.map((img) => (
          <View key={img.url} style={styles.thumbWrap}>
            <Image source={{ uri: img.url }} style={styles.thumb} contentFit="cover" />
            {img.isPrimary ? <Text style={styles.primaryBadge}>Главное</Text> : null}
            <View style={styles.thumbActions}>
              {!img.isPrimary ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Сделать главным" onPress={() => onSetPrimary(img.url)}>
                  <Text style={styles.action}>★</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" accessibilityLabel="Удалить фото" onPress={() => onRemove(img.url)}>
                <Text style={styles.actionDanger}>✕</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <Pressable
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Добавить фото"
          onPress={onAdd}
          disabled={uploading || images.length >= 10}
        >
          {uploading ? <ActivityIndicator /> : <Text style={styles.addText}>+ Фото</Text>}
        </Pressable>
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {images.length >= 10 ? <Text style={styles.hint}>Максимум 10 изображений</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  row: { gap: spacing.sm },
  thumbWrap: {
    width: 112,
    height: 112,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: surface.backgroundMuted,
  },
  thumb: { width: "100%", height: "100%" },
  primaryBadge: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: "rgba(0,0,0,0.65)",
    color: "#fff",
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    ...typography.caption,
  },
  thumbActions: {
    position: "absolute",
    bottom: spacing.xs,
    right: spacing.xs,
    flexDirection: "row",
    gap: spacing.xs,
  },
  action: { ...typography.body, color: "#fff", fontWeight: "700" },
  actionDanger: { ...typography.body, color: "#FCA5A5", fontWeight: "700" },
  addBtn: {
    width: 112,
    height: 112,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: border.default,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    minHeight: layout.buttonHeight,
  },
  addText: { ...typography.caption, color: text.secondary, fontWeight: "600" },
  error: { ...typography.caption, color: "#DC2626" },
  hint: { ...typography.caption, color: text.muted },
});
