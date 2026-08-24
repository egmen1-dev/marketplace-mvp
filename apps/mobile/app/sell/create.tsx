import { router, Stack } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { PrimaryButton, SecondaryButton } from "../../src/components/ui";
import { ProductImageFallback } from "../../src/components/ui/ProductImageFallback";
import { LotAutosaveIndicator } from "../../src/seller/LotAutosaveIndicator";
import { LotCreatePreviewFooter } from "../../src/seller/LotCreatePreviewFooter";
import { LotCreateStickyFooter } from "../../src/seller/LotCreateStickyFooter";
import { conditionPreviewLabel, formatPickupPreview } from "../../src/seller/lot-create-preview";
import { LotRestorePrompt } from "../../src/seller/LotRestorePrompt";
import { LOT_CONDITION_OPTIONS, emojiForCategoryName } from "../../src/seller/lot-create-constants";
import { LOT_CREATE_COPY } from "../../src/seller/lot-create-copy";
import { EMPTY_LOT_DRAFT } from "../../src/seller/lot-draft-storage";
import { useLotCreateForm } from "../../src/seller/use-lot-create-form";
import { formatPrice } from "../../src/utils/format";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

function LotCreateErrorBlock({
  error,
  detail,
  canRetry,
  onRetry,
}: {
  error: string | null;
  detail: string | null;
  canRetry: boolean;
  onRetry: () => void;
}) {
  if (!error) return null;
  return (
    <View style={styles.errorBlock}>
      <Text style={styles.errorText}>{error}</Text>
      {detail ? <Text style={styles.errorDetail}>{detail}</Text> : null}
      {canRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retryText}>{LOT_CREATE_COPY.retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function CreateLotScreen() {
  const form = useLotCreateForm();

  if (form.showRestorePrompt) {
    return (
      <LotRestorePrompt
        onContinue={() => void form.continueRestore()}
        onDelete={() => void form.discardRestore()}
      />
    );
  }

  const header = (
    <View style={styles.headerRow}>
      <View style={styles.headerText}>
        <LotAutosaveIndicator status={form.autosaveStatus} />
      </View>
    </View>
  );

  if (form.step === "success") {
    return (
      <View style={styles.successWrap}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>{LOT_CREATE_COPY.successTitle}</Text>
        <Text style={styles.successBody}>{LOT_CREATE_COPY.successBody}</Text>
        {form.info ? <Text style={styles.infoText}>{form.info}</Text> : null}
        {form.error ? <Text style={styles.errorText}>{form.error}</Text> : null}
        <View style={styles.actions}>
          {form.publishedId ? (
            <PrimaryButton
              label={LOT_CREATE_COPY.viewLot}
              fullWidth
              onPress={() => router.replace(`/product/${form.publishedId}`)}
            />
          ) : null}
          <SecondaryButton
            label={LOT_CREATE_COPY.createAnother}
            fullWidth
            onPress={() => {
              form.setDraft(EMPTY_LOT_DRAFT);
              form.setStep("photos");
              form.setPublishedId(null);
              form.setError(null);
              form.setInfo(null);
            }}
          />
          <SecondaryButton label="Мои ЛОТы" fullWidth onPress={() => router.replace("/(tabs)/seller-products")} />
        </View>
      </View>
    );
  }

  if (form.step === "preview") {
    const pickupPreview = formatPickupPreview(form.pickupPoints, form.draft.pickupPointIds);
    const categoryLabel = form.draft.categoryName ?? form.draft.productTypeName;

    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: LOT_CREATE_COPY.previewTitle }} />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {header}
          <Text style={styles.screenTitle}>{LOT_CREATE_COPY.previewTitle}</Text>
          <Text style={styles.subtitle}>{LOT_CREATE_COPY.previewHint}</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewImageWrap}>
              {form.draft.images[0]?.uri ? (
                <Image source={{ uri: form.draft.images[0].uri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.previewImage}>
                  <ProductImageFallback />
                </View>
              )}
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Название</Text>
              <Text style={styles.previewValue}>{form.draft.title}</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Цена</Text>
              <Text style={styles.previewValue}>{formatPrice(form.priceNumber)}</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Город</Text>
              <Text style={styles.previewValue}>{form.draft.city}</Text>
            </View>
            {categoryLabel ? (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Категория</Text>
                <Text style={styles.previewValue}>{categoryLabel}</Text>
              </View>
            ) : null}
            <View style={styles.previewRow}>
              <Text style={styles.previewValue}>{conditionPreviewLabel(form.draft.condition)}</Text>
            </View>
            {form.draft.pickupEnabled ? (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{pickupPreview.title}</Text>
                <Text style={styles.previewValue}>{pickupPreview.detail ?? "Не выбрано"}</Text>
              </View>
            ) : null}
            {form.draft.description ? <Text style={styles.previewDescription}>{form.draft.description}</Text> : null}
          </View>
          <LotCreateErrorBlock
            error={form.error}
            detail={form.errorDetail}
            canRetry={form.canRetry}
            onRetry={() => void form.retryLastAction()}
          />
          {form.info ? <Text style={styles.infoText}>{form.info}</Text> : null}
        </ScrollView>
        <LotCreatePreviewFooter
          publishLabel={LOT_CREATE_COPY.publishLabel}
          saveLabel={LOT_CREATE_COPY.saveLotLabel}
          publishing={form.publishing}
          saving={form.savingLot}
          onPublish={() => void form.publishLot()}
          onSave={() => void form.saveLotLocallyAndServer()}
          onBack={() => form.goToStep("details")}
        />
      </View>
    );
  }

  if (form.step === "details") {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {header}
          <Text style={styles.screenTitle}>{LOT_CREATE_COPY.detailsTitle}</Text>
          <Text style={styles.subtitle}>{LOT_CREATE_COPY.detailsHint}</Text>

          <Text style={styles.label}>Название</Text>
          <TextInput
            style={styles.input}
            placeholder="Дрель ударная DeWalt"
            value={form.draft.title}
            onChangeText={(title) => form.persist({ ...form.draft, title, step: "details" })}
          />

          <Text style={styles.label}>Выберите категорию</Text>
          <View style={styles.categoryGrid}>
            {form.rootCategories.map((cat) => (
              <Pressable
                key={cat.id}
                style={[styles.categoryCard, form.draft.categoryId === cat.id ? styles.categoryCardActive : null]}
                onPress={() => void form.selectRootCategory(cat)}
              >
                <Text style={styles.categoryEmoji}>{emojiForCategoryName(cat.name)}</Text>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>

          {form.subcategories.length > 0 ? (
            <View style={styles.subList}>
              {form.subcategories.map((sub) => (
                <Pressable key={sub.id} style={styles.subRow} onPress={() => void form.selectRootCategory(sub)}>
                  <Text style={styles.subName}>{sub.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {form.productTypes.length > 0 ? (
            <>
              <Text style={styles.label}>{LOT_CREATE_COPY.productTypeLabel}</Text>
              {form.productTypes.map((pt) => (
                <Pressable
                  key={pt.id}
                  style={[styles.subRow, form.draft.productTypeId === pt.id ? styles.subRowActive : null]}
                  onPress={() => void form.selectProductType(pt)}
                >
                  <Text style={styles.subName}>{pt.name}</Text>
                </Pressable>
              ))}
            </>
          ) : null}

          <Text style={styles.label}>{LOT_CREATE_COPY.priceLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder="₽"
            keyboardType="numeric"
            value={form.draft.price}
            onChangeText={(price) => form.persist({ ...form.draft, price, step: "details" })}
          />

          <Text style={styles.label}>{LOT_CREATE_COPY.stockLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            keyboardType="numeric"
            value={form.draft.stock}
            onChangeText={(stock) => form.persist({ ...form.draft, stock, step: "details" })}
          />

          <Text style={styles.label}>{LOT_CREATE_COPY.descriptionTitle}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={LOT_CREATE_COPY.descriptionPlaceholder}
            multiline
            value={form.draft.description}
            onChangeText={(description) => form.persist({ ...form.draft, description, step: "details" })}
          />

          <Text style={styles.label}>Состояние</Text>
          <View style={styles.conditionRow}>
            {LOT_CONDITION_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.conditionChip, form.draft.condition === opt.id ? styles.conditionChipActive : null]}
                onPress={() => form.persist({ ...form.draft, condition: opt.id, step: "details" })}
              >
                <Text style={[styles.conditionText, form.draft.condition === opt.id ? styles.conditionTextActive : null]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Город</Text>
          <TextInput
            style={styles.input}
            placeholder="Москва"
            value={form.draft.city}
            onChangeText={(city) => form.persist({ ...form.draft, city, step: "details" })}
          />

          <View style={styles.pickupHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{LOT_CREATE_COPY.pickupTitle}</Text>
              <Text style={styles.pickupHint}>{LOT_CREATE_COPY.pickupHint}</Text>
            </View>
            <Switch
              value={form.draft.pickupEnabled}
              onValueChange={(value) => form.togglePickupEnabled(value)}
              trackColor={{ true: colors.orangeSoft, false: colors.gray200 }}
              thumbColor={form.draft.pickupEnabled ? colors.orange : colors.white}
            />
          </View>

          {form.draft.pickupEnabled ? (
            <View style={styles.pickupList}>
              {form.pickupLoadError ? <Text style={styles.errorText}>{form.pickupLoadError}</Text> : null}
              {form.pickupPoints.length === 0 && !form.pickupLoadError ? (
                <Text style={styles.pickupHint}>Добавьте точку самовывоза в веб-кабинете продавца.</Text>
              ) : null}
              {form.pickupPoints.map((point) => {
                const selected = form.draft.pickupPointIds.includes(point.id);
                return (
                  <Pressable
                    key={point.id}
                    style={[styles.subRow, selected ? styles.subRowActive : null]}
                    onPress={() => form.togglePickupPoint(point.id)}
                  >
                    <Text style={styles.subName}>{point.name}</Text>
                    <Text style={styles.pickupHint}>
                      {point.city}, {point.address}
                    </Text>
                  </Pressable>
                );
              })}
              {form.draft.pickupEnabled && form.draft.pickupPointIds.length === 0 && form.pickupPoints.length > 0 ? (
                <Text style={styles.errorText}>Выберите хотя бы одну точку самовывоза.</Text>
              ) : null}
            </View>
          ) : null}

          <LotCreateErrorBlock
            error={form.error}
            detail={form.errorDetail}
            canRetry={form.canRetry}
            onRetry={() => void form.retryLastAction()}
          />
          {form.info ? <Text style={styles.infoText}>{form.info}</Text> : null}

          <SecondaryButton label="Назад" fullWidth onPress={() => form.goToStep("photos")} />
        </ScrollView>
        <LotCreateStickyFooter
          label="Предпросмотр"
          disabled={!form.canContinueDetails}
          onPress={() => void form.goPreview()}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {header}
        <Text style={styles.screenTitle}>{LOT_CREATE_COPY.photosTitle}</Text>
        <Text style={styles.subtitle}>{LOT_CREATE_COPY.photosHint}</Text>

        <View style={styles.photoGrid}>
          {form.draft.images.map((img, index) => (
            <View key={`${img.uri}-${index}`} style={styles.photoCell}>
              <Image source={{ uri: img.uri }} style={styles.photo} />
              <Pressable
                style={styles.photoRemove}
                onPress={() =>
                  void form.persist({
                    ...form.draft,
                    images: form.draft.images.filter((_, i) => i !== index),
                    step: "photos",
                  })
                }
              >
                <MaterialCommunityIcons name="close" size={16} color={colors.white} />
              </Pressable>
            </View>
          ))}
          {form.draft.images.length < 10 ? (
            <Pressable style={styles.addPhoto} onPress={() => void form.pickImages(false)}>
              <MaterialCommunityIcons name="plus" size={28} color={colors.orange} />
              <Text style={styles.addPhotoText}>Добавить фото</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.photoActions}>
          <SecondaryButton label="Камера" onPress={() => void form.pickImages(true)} />
          <SecondaryButton label="Галерея" onPress={() => void form.pickImages(false)} />
        </View>

        <LotCreateErrorBlock
          error={form.error}
          detail={form.errorDetail}
          canRetry={form.canRetry}
          onRetry={() => void form.retryLastAction()}
        />
      </ScrollView>
      <LotCreateStickyFooter
        label={LOT_CREATE_COPY.photosNext}
        disabled={!form.canContinuePhotos}
        onPress={() => form.goToStep("details")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  scrollContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  headerRow: { marginBottom: spacing.xs },
  headerText: { alignItems: "flex-end" },
  screenTitle: { ...typography.h1, color: colors.black },
  subtitle: { ...typography.body, color: colors.gray500 },
  label: { ...typography.caption, color: colors.gray700, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.black,
  },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoCell: { width: "30%", aspectRatio: 1, borderRadius: radii.md, overflow: "hidden" },
  photo: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhoto: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.orangeSoft,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  addPhotoText: { ...typography.caption, color: colors.orange, fontWeight: "600", textAlign: "center" },
  photoActions: { flexDirection: "row", gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  inlineActions: { gap: spacing.sm },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryCard: {
    width: "30%",
    minHeight: 88,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  categoryCardActive: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  categoryEmoji: { fontSize: 24 },
  categoryName: { ...typography.caption, textAlign: "center", color: colors.black },
  subList: { gap: spacing.xs },
  subRow: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    gap: spacing.xs,
  },
  subRowActive: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  subName: { ...typography.body, color: colors.black },
  conditionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  conditionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  conditionChipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  conditionText: { ...typography.caption, color: colors.gray900, fontWeight: "600" },
  conditionTextActive: { color: colors.white },
  pickupHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  pickupHint: { ...typography.caption, color: colors.gray500 },
  pickupList: { gap: spacing.sm },
  previewCard: { gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.gray100 },
  previewImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.gray200,
  },
  previewImage: { width: "100%", height: "100%" },
  previewRow: { gap: spacing.xs },
  previewLabel: { ...typography.caption, color: colors.gray500, fontWeight: "600" },
  previewValue: { ...typography.body, color: colors.black },
  previewTitle: { ...typography.h2, color: colors.black },
  previewPrice: { ...typography.price, color: colors.black },
  previewMeta: { ...typography.caption, color: colors.gray500 },
  previewDescription: { ...typography.body, color: colors.gray700 },
  errorBlock: { gap: spacing.xs },
  errorText: { ...typography.caption, color: colors.danger },
  errorDetail: { ...typography.caption, color: colors.gray700 },
  retryText: { ...typography.caption, color: colors.orange, fontWeight: "700" },
  infoText: { ...typography.caption, color: colors.gray700 },
  successWrap: { flex: 1, padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.md },
  successEmoji: { fontSize: 48 },
  successTitle: { ...typography.h1, color: colors.black, textAlign: "center" },
  successBody: { ...typography.body, color: colors.gray500, textAlign: "center" },
});
