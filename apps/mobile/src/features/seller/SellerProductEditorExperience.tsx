import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { TextField } from "../../design-system/components/TextField";
import { UniversalBottomSheet } from "../../design-system/components/UniversalBottomSheet";
import { SecondaryButton } from "../../design-system/forms/buttons";
import { HomeSectionSkeleton } from "../../design-system/feedback/States";
import { PageContainer } from "../../design-system/layout/ScreenLayout";
import { Badge } from "../../design-system/primitives/Badge";
import { brand, border, surface, text } from "../../design-system/tokens/colors";
import { layout } from "../../design-system/tokens/layout";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import type { SellerCategoryOption } from "../../domain/contracts/entities/seller";
import { ModerationFeedbackCard } from "./editor/ModerationFeedbackCard";
import { ProductEditorGallery } from "./editor/ProductEditorGallery";
import { VISIBILITY_LABELS } from "./editor/seller-product-editor-view";
import type { useSellerProductEditor } from "./editor/useSellerProductEditor";

type Props = {
  state: ReturnType<typeof useSellerProductEditor>;
  onPublishPress: () => void;
};

export function SellerProductEditorExperience({ state, onPublishPress }: Props) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [productTypes, setProductTypes] = useState<Array<{ id: string; name: string; categoryId: string }>>([]);

  if (state.loading || !state.form) {
    return (
      <PageContainer style={styles.container}>
        <HomeSectionSkeleton />
      </PageContainer>
    );
  }

  const form = state.form;

  const openPreview = () => {
    if (form.previewAvailable && form.previewProductId) {
      router.push(`/product/${form.previewProductId}`);
    }
  };

  return (
    <PageContainer style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{state.productId ? "Редактор товара" : "Новый товар"}</Text>
          <View style={styles.statusRow}>
            {state.autosaving ? <Badge label="Сохранение…" tone="neutral" /> : null}
            {state.saveMessage ? <Badge label={state.saveMessage} tone="success" /> : null}
            {state.fromCache ? <Badge label="Черновик офлайн" tone="warning" /> : null}
          </View>
        </View>

        {state.error ? <SectionErrorCard message={state.error} onRetry={() => void state.refresh()} /> : null}

        <ModerationFeedbackCard moderation={form.moderation} />

        <ProductEditorGallery
          images={form.images}
          uploading={state.uploadingImage}
          error={state.validation?.fieldErrors.images}
          onAdd={() => void state.uploadImage()}
          onRemove={state.removeImage}
          onSetPrimary={state.setPrimaryImage}
        />

        <TextField
          label="Название"
          value={form.title}
          onChangeText={(title) => state.patchForm({ title })}
          error={state.validation?.fieldErrors.title}
          accessibilityLabel="Название товара"
        />

        <TextField
          label="Описание"
          value={form.description}
          onChangeText={(description) => state.patchForm({ description })}
          multiline
          numberOfLines={4}
          accessibilityLabel="Описание товара"
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <TextField
              label="Цена, ₽"
              value={form.price}
              onChangeText={(price) => state.patchForm({ price })}
              keyboardType="decimal-pad"
              error={state.validation?.fieldErrors.price}
              accessibilityLabel="Цена"
            />
          </View>
          <View style={styles.half}>
            <TextField
              label="Остаток"
              value={form.stock}
              onChangeText={(stock) => state.patchForm({ stock })}
              keyboardType="number-pad"
              error={state.validation?.fieldErrors.stock}
              accessibilityLabel="Остаток"
            />
          </View>
        </View>

        {form.compareAt != null ? (
          <Text style={styles.readonly}>Старая цена (только чтение): {form.compareAt} ₽</Text>
        ) : null}

        <TextField
          label="SKU"
          value={form.sku}
          onChangeText={(sku) => state.patchForm({ sku })}
          accessibilityLabel="SKU"
        />

        <Pressable style={styles.selector} accessibilityRole="button" onPress={() => setCategoryOpen(true)}>
          <Text style={styles.selectorLabel}>Категория</Text>
          <Text style={styles.selectorValue}>{form.categoryName ?? "Выберите категорию"}</Text>
        </Pressable>

        {form.categoryId ? (
          <Pressable
            style={styles.selector}
            accessibilityRole="button"
            onPress={async () => {
              const types = await state.loadProductTypes(form.categoryId!);
              setProductTypes([...types]);
              setTypeOpen(true);
            }}
          >
            <Text style={styles.selectorLabel}>Тип товара / атрибуты</Text>
            <Text style={styles.selectorValue}>{form.productTypeName ?? "Выберите тип"}</Text>
          </Pressable>
        ) : null}

        {form.characteristics.map((characteristic, index) => (
          <TextField
            key={characteristic.definitionId}
            label={`${characteristic.name}${characteristic.required ? " *" : ""}`}
            value={characteristic.value}
            onChangeText={(value) => {
              const next = [...form.characteristics];
              next[index] = { ...next[index], value };
              state.patchForm({ characteristics: next });
            }}
            accessibilityLabel={characteristic.name}
          />
        ))}

        <View style={styles.visibilityBlock}>
          <Text style={styles.selectorLabel}>Видимость</Text>
          <View style={styles.visibilityRow}>
            {(Object.keys(VISIBILITY_LABELS) as Array<keyof typeof VISIBILITY_LABELS>).map((key) => {
              const selected = form.visibility === key;
              return (
                <Pressable
                  key={String(key)}
                  style={[styles.visibilityChip, selected ? styles.visibilityChipActive : null]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => state.patchForm({ visibility: key, status: key === "published" ? "ACTIVE" : key === "hidden" ? "ARCHIVED" : "DRAFT" })}
                >
                  <Text style={[styles.visibilityText, selected ? styles.visibilityTextActive : null]}>
                    {VISIBILITY_LABELS[key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <SecondaryButton label={state.saving ? "Сохранение…" : "Сохранить черновик"} onPress={() => void state.save({ forceDraft: true })} />
          <SecondaryButton label="Отменить изменения" onPress={state.undo} />
          <SecondaryButton label="Опубликовать" onPress={onPublishPress} />
          <SecondaryButton
            label={form.previewAvailable ? "Предпросмотр карточки" : "Предпросмотр после публикации"}
            onPress={openPreview}
            disabled={!form.previewAvailable}
          />
        </View>
      </ScrollView>

      <UniversalBottomSheet visible={categoryOpen} title="Категория" onClose={() => setCategoryOpen(false)}>
        <View style={styles.sheetList}>
          {state.categories.map((category: SellerCategoryOption) => (
            <Pressable
              key={category.id}
              style={styles.sheetRow}
              accessibilityRole="button"
              onPress={() => {
                state.selectCategory(category);
                setCategoryOpen(false);
              }}
            >
              <Text style={styles.sheetRowText}>{category.pathLabel ?? category.name}</Text>
            </Pressable>
          ))}
        </View>
      </UniversalBottomSheet>

      <UniversalBottomSheet visible={typeOpen} title="Тип товара" onClose={() => setTypeOpen(false)}>
        <View style={styles.sheetList}>
          {productTypes.map((type) => (
            <Pressable
              key={type.id}
              style={styles.sheetRow}
              accessibilityRole="button"
              onPress={() => {
                void state.selectProductType(type);
                setTypeOpen(false);
              }}
            >
              <Text style={styles.sheetRowText}>{type.name}</Text>
            </Pressable>
          ))}
        </View>
      </UniversalBottomSheet>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm },
  title: { ...typography.h2, color: text.primary, fontWeight: "700" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
  readonly: { ...typography.caption, color: text.muted },
  selector: {
    minHeight: layout.buttonHeight,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: surface.card,
    gap: spacing.xs,
  },
  selectorLabel: { ...typography.caption, color: text.muted, fontWeight: "600" },
  selectorValue: { ...typography.body, color: text.primary },
  visibilityBlock: { gap: spacing.sm },
  visibilityRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  visibilityChip: {
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: border.default,
    justifyContent: "center",
  },
  visibilityChipActive: { backgroundColor: brand.primarySoft, borderColor: brand.primary },
  visibilityText: { ...typography.caption, color: text.secondary, fontWeight: "600" },
  visibilityTextActive: { color: brand.primary },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  sheetList: { gap: spacing.xs },
  sheetRow: {
    minHeight: layout.buttonHeight,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: border.default,
    paddingVertical: spacing.sm,
  },
  sheetRowText: { ...typography.bodySmall, color: text.primary },
});
