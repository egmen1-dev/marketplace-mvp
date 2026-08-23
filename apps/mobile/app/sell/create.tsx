import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import {
  createSellerLot,
  fetchTaxonomyBrowse,
  suggestProductType,
  uploadSellerLotImage,
} from "../../src/api/seller-lot";
import { PrimaryButton, SecondaryButton } from "../../src/components/ui";
import { ProductImageFallback } from "../../src/components/ui/ProductImageFallback";
import { LOT_CONDITION_OPTIONS, emojiForCategoryName } from "../../src/seller/lot-create-constants";
import {
  EMPTY_LOT_DRAFT,
  clearLotDraft,
  loadLotDraft,
  saveLotDraft,
  type LotDraft,
} from "../../src/seller/lot-draft-storage";
import { formatPrice } from "../../src/utils/format";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

type WizardStep = "photos" | "details" | "preview" | "success";

export default function CreateLotScreen() {
  const [step, setStep] = useState<WizardStep>("photos");
  const [draft, setDraft] = useState<LotDraft>(EMPTY_LOT_DRAFT);
  const [rootCategories, setRootCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string }>>([]);
  const [productTypes, setProductTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const saved = await loadLotDraft();
      if (saved?.title || saved?.images.length) {
        Alert.alert("Черновик ЛОТа", "Продолжить создание?", [
          { text: "Начать заново", style: "destructive", onPress: () => void clearLotDraft() },
          { text: "Продолжить", onPress: () => {
            setDraft(saved);
            setStep(saved.step ?? "photos");
          }},
        ]);
      }
      const browse = await fetchTaxonomyBrowse("root").catch(() => ({ children: [], productTypes: [] }));
      setRootCategories(browse.children ?? []);
    })();
  }, []);

  const persist = useCallback(async (next: LotDraft) => {
    setDraft(next);
    await saveLotDraft(next);
  }, []);

  async function pickImages(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Нужен доступ", useCamera ? "Разрешите камеру" : "Разрешите галерею");
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.85, selectionLimit: 10 });
    if (result.canceled) return;
    const nextImages = [
      ...draft.images,
      ...result.assets.map((a) => ({ uri: a.uri })),
    ].slice(0, 10);
    await persist({ ...draft, images: nextImages, step: "photos" });
  }

  async function selectRootCategory(cat: { id: string; name: string }) {
    const browse = await fetchTaxonomyBrowse(cat.id);
    setSubcategories(browse.children ?? []);
    setProductTypes(browse.productTypes ?? []);
    await persist({
      ...draft,
      categoryId: cat.id,
      categoryName: cat.name,
      productTypeId: null,
      productTypeName: null,
    });
  }

  async function selectProductType(pt: { id: string; name: string }) {
    await persist({
      ...draft,
      productTypeId: pt.id,
      productTypeName: pt.name,
    });
  }

  const priceNumber = useMemo(() => Number(draft.price.replace(/\s/g, "").replace(",", ".")), [draft.price]);
  const canContinuePhotos = draft.images.length > 0;
  const canContinueDetails =
    draft.title.trim().length >= 2 &&
    priceNumber > 0 &&
    draft.city.trim().length >= 2 &&
    Boolean(draft.productTypeId);

  async function goPreview() {
    if (!canContinueDetails) {
      setError("Заполните название, цену, город и категорию");
      return;
    }
    const suggestion = await suggestProductType(draft.title);
    const next = {
      ...draft,
      productTypeId: draft.productTypeId ?? suggestion.productTypeId,
      productTypeName: draft.productTypeName ?? suggestion.productTypeName,
      categoryId: draft.categoryId ?? suggestion.categoryId,
      categoryName: draft.categoryName ?? suggestion.categoryName,
      step: "preview" as const,
    };
    await persist(next);
    setStep("preview");
    setError(null);
  }

  async function publishLot() {
    setPublishing(true);
    setError(null);
    try {
      const images = [];
      for (const img of draft.images) {
        if (img.uploadedUrl) {
          images.push({ url: img.uploadedUrl, pathname: img.uploadedPathname ?? null });
          continue;
        }
        const uploaded = await uploadSellerLotImage(img.uri);
        images.push({ url: uploaded.url, pathname: uploaded.pathname });
      }

      let productId: string | null = null;
      try {
        const created = await createSellerLot({
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          price: priceNumber,
          city: draft.city.trim(),
          condition: draft.condition,
          productTypeId: draft.productTypeId,
          categoryId: draft.categoryId,
          images,
          status: "ACTIVE",
        });
        productId = created.product.id;
      } catch (err) {
        const created = await createSellerLot({
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          price: priceNumber,
          city: draft.city.trim(),
          condition: draft.condition,
          productTypeId: draft.productTypeId,
          categoryId: draft.categoryId,
          images,
          status: "DRAFT",
        });
        productId = created.product.id;
        setError("ЛОТ сохранён как черновик — дополните характеристики в веб-кабинете для публикации");
      }

      setPublishedId(productId);
      await clearLotDraft();
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось опубликовать ЛОТ");
    } finally {
      setPublishing(false);
    }
  }

  if (step === "success") {
    return (
      <View style={styles.successWrap}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>ЛОТ опубликован</Text>
        <Text style={styles.successBody}>Покупатели уже могут его увидеть</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.actions}>
          {publishedId ? (
            <PrimaryButton label="Открыть ЛОТ" fullWidth onPress={() => router.replace(`/product/${publishedId}`)} />
          ) : null}
          <SecondaryButton
            label="Создать новый ЛОТ"
            fullWidth
            onPress={() => {
              setDraft(EMPTY_LOT_DRAFT);
              setStep("photos");
              setPublishedId(null);
              setError(null);
            }}
          />
          <SecondaryButton label="Мои ЛОТы" fullWidth onPress={() => router.replace("/(tabs)/seller-products")} />
        </View>
      </View>
    );
  }

  if (step === "preview") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.screenTitle}>Ваш ЛОТ</Text>
        <View style={styles.previewCard}>
          {draft.images[0]?.uri ? (
            <Image source={{ uri: draft.images[0].uri }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewImage}><ProductImageFallback /></View>
          )}
          <Text style={styles.previewTitle}>{draft.title}</Text>
          <Text style={styles.previewPrice}>{formatPrice(priceNumber)}</Text>
          <Text style={styles.previewMeta}>{draft.city}</Text>
          {draft.productTypeName ? <Text style={styles.previewMeta}>{draft.productTypeName}</Text> : null}
          {draft.description ? <Text style={styles.previewDescription}>{draft.description}</Text> : null}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.actions}>
          <SecondaryButton label="Назад" fullWidth onPress={() => setStep("details")} />
          <PrimaryButton label="Опубликовать ЛОТ" fullWidth loading={publishing} onPress={() => void publishLot()} />
        </View>
      </ScrollView>
    );
  }

  if (step === "details") {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>Информация о ЛОТе</Text>

        <Text style={styles.label}>Название ЛОТа</Text>
        <TextInput
          style={styles.input}
          placeholder="Дрель ударная DeWalt"
          value={draft.title}
          onChangeText={(title) => void persist({ ...draft, title, step: "details" })}
        />

        <Text style={styles.label}>Выберите категорию</Text>
        <View style={styles.categoryGrid}>
          {rootCategories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[styles.categoryCard, draft.categoryId === cat.id ? styles.categoryCardActive : null]}
              onPress={() => void selectRootCategory(cat)}
            >
              <Text style={styles.categoryEmoji}>{emojiForCategoryName(cat.name)}</Text>
              <Text style={styles.categoryName} numberOfLines={2}>{cat.name}</Text>
            </Pressable>
          ))}
        </View>

        {subcategories.length > 0 ? (
          <View style={styles.subList}>
            {subcategories.map((sub) => (
              <Pressable key={sub.id} style={styles.subRow} onPress={() => void selectRootCategory(sub)}>
                <Text style={styles.subName}>{sub.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {productTypes.length > 0 ? (
          <>
            <Text style={styles.label}>Тип товара</Text>
            {productTypes.map((pt) => (
              <Pressable
                key={pt.id}
                style={[styles.subRow, draft.productTypeId === pt.id ? styles.subRowActive : null]}
                onPress={() => void selectProductType(pt)}
              >
                <Text style={styles.subName}>{pt.name}</Text>
              </Pressable>
            ))}
          </>
        ) : null}

        <Text style={styles.label}>Цена</Text>
        <TextInput
          style={styles.input}
          placeholder="₽"
          keyboardType="numeric"
          value={draft.price}
          onChangeText={(price) => void persist({ ...draft, price, step: "details" })}
        />

        <Text style={styles.label}>Расскажите о ЛОТе</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Описание товара"
          multiline
          value={draft.description}
          onChangeText={(description) => void persist({ ...draft, description, step: "details" })}
        />

        <Text style={styles.label}>Состояние</Text>
        <View style={styles.conditionRow}>
          {LOT_CONDITION_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={[styles.conditionChip, draft.condition === opt.id ? styles.conditionChipActive : null]}
              onPress={() => void persist({ ...draft, condition: opt.id, step: "details" })}
            >
              <Text style={[styles.conditionText, draft.condition === opt.id ? styles.conditionTextActive : null]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Город</Text>
        <TextInput
          style={styles.input}
          placeholder="Москва"
          value={draft.city}
          onChangeText={(city) => void persist({ ...draft, city, step: "details" })}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <SecondaryButton label="Назад" fullWidth onPress={() => setStep("photos")} />
          <PrimaryButton label="Предпросмотр" fullWidth onPress={() => void goPreview()} disabled={!canContinueDetails} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.screenTitle}>Создайте ЛОТ</Text>
      <Text style={styles.subtitle}>Добавьте фотографии товара</Text>

      <View style={styles.photoGrid}>
        {draft.images.map((img, index) => (
          <View key={`${img.uri}-${index}`} style={styles.photoCell}>
            <Image source={{ uri: img.uri }} style={styles.photo} />
            <Pressable
              style={styles.photoRemove}
              onPress={() => void persist({ ...draft, images: draft.images.filter((_, i) => i !== index) })}
            >
              <MaterialCommunityIcons name="close" size={16} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {draft.images.length < 10 ? (
          <Pressable style={styles.addPhoto} onPress={() => void pickImages(false)}>
            <MaterialCommunityIcons name="plus" size={28} color={colors.orange} />
            <Text style={styles.addPhotoText}>Добавить фото</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.photoActions}>
        <SecondaryButton label="Камера" onPress={() => void pickImages(true)} />
        <SecondaryButton label="Галерея" onPress={() => void pickImages(false)} />
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Далее"
          fullWidth
          disabled={!canContinuePhotos}
          onPress={() => {
            setStep("details");
            void persist({ ...draft, step: "details" });
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white },
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
  previewCard: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.gray100 },
  previewImage: { width: "100%", aspectRatio: 1, borderRadius: radii.md, overflow: "hidden" },
  previewTitle: { ...typography.h2, color: colors.black },
  previewPrice: { ...typography.price, color: colors.black },
  previewMeta: { ...typography.caption, color: colors.gray500 },
  previewDescription: { ...typography.body, color: colors.gray700 },
  errorText: { ...typography.caption, color: colors.danger },
  successWrap: { flex: 1, padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.md },
  successEmoji: { fontSize: 48 },
  successTitle: { ...typography.h1, color: colors.black, textAlign: "center" },
  successBody: { ...typography.body, color: colors.gray500, textAlign: "center" },
});
