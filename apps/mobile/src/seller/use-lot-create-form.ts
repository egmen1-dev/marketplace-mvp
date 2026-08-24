import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

import {
  createSellerLot,
  fetchSellerPickupPoints,
  fetchTaxonomyBrowse,
  suggestProductType,
  uploadSellerLotImage,
  type SellerPickupPoint,
} from "../api/seller-lot";
import { LOT_CREATE_COPY } from "./lot-create-copy";
import { formatLotCreateError, type LotCreateErrorContext } from "./lot-create-errors";
import {
  EMPTY_LOT_DRAFT,
  clearLotDraft,
  isUnfinishedLot,
  loadLotDraft,
  saveLotDraft,
  type LotDraft,
} from "./lot-draft-storage";

export type LotWizardStep = "photos" | "details" | "preview" | "success";
export type AutosaveStatus = "idle" | "saving" | "saved";

export function useLotCreateForm() {
  const draftRef = useRef<LotDraft>(EMPTY_LOT_DRAFT);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [step, setStep] = useState<LotWizardStep>("photos");
  const [draft, setDraft] = useState<LotDraft>(EMPTY_LOT_DRAFT);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<LotDraft | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [rootCategories, setRootCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string }>>([]);
  const [productTypes, setProductTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [pickupPoints, setPickupPoints] = useState<SellerPickupPoint[]>([]);
  const [pickupLoadError, setPickupLoadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [savingLot, setSavingLot] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const lastFailedActionRef = useRef<LotCreateErrorContext | null>(null);
  const uploadFailedRef = useRef(false);
  const retryIntentRef = useRef<"save" | "publish">("publish");

  const setHumanError = useCallback((err: unknown, context: LotCreateErrorContext) => {
    const formatted = formatLotCreateError(err, context);
    lastFailedActionRef.current = context;
    setError(formatted.message);
    setErrorDetail(formatted.detail);
    setCanRetry(formatted.canRetry);
  }, []);

  const clearErrors = useCallback(() => {
    setError(null);
    setErrorDetail(null);
    setCanRetry(false);
    lastFailedActionRef.current = null;
  }, []);

  const flushSave = useCallback(async (next: LotDraft) => {
    setAutosaveStatus("saving");
    try {
      await saveLotDraft(next);
      setAutosaveStatus("saved");
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
      savedFadeRef.current = setTimeout(() => setAutosaveStatus("idle"), 2500);
    } catch {
      setAutosaveStatus("idle");
    }
  }, []);

  const persist = useCallback(
    (next: LotDraft, options?: { immediate?: boolean }) => {
      setDraft(next);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (options?.immediate) {
        void flushSave(next);
        return;
      }
      saveTimerRef.current = setTimeout(() => {
        void flushSave(next);
      }, 400);
    },
    [flushSave],
  );

  const restoreTaxonomy = useCallback(async (saved: LotDraft) => {
    const browse = await fetchTaxonomyBrowse("root").catch(() => ({ children: [], productTypes: [] }));
    setRootCategories(browse.children ?? []);
    if (saved.categoryId) {
      const catBrowse = await fetchTaxonomyBrowse(saved.categoryId).catch(() => ({
        children: [],
        productTypes: [],
      }));
      setSubcategories(catBrowse.children ?? []);
      setProductTypes(catBrowse.productTypes ?? []);
    }
  }, []);

  const loadPickupPoints = useCallback(async () => {
    setPickupLoadError(null);
    try {
      const res = await fetchSellerPickupPoints();
      setPickupPoints(res.items ?? []);
    } catch {
      setPickupLoadError(LOT_CREATE_COPY.pickupLoadError);
      await flushSave(draftRef.current);
    }
  }, [flushSave]);

  useEffect(() => {
    void (async () => {
      const saved = await loadLotDraft();
      const browse = await fetchTaxonomyBrowse("root").catch(() => ({ children: [], productTypes: [] }));
      setRootCategories(browse.children ?? []);
      if (isUnfinishedLot(saved)) {
        setPendingRestore(saved);
        setShowRestorePrompt(true);
        return;
      }
      void loadPickupPoints();
    })();

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
      void saveLotDraft(draftRef.current);
    };
  }, [loadPickupPoints]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void saveLotDraft(draftRef.current);
      };
    }, []),
  );

  const continueRestore = useCallback(async () => {
    if (!pendingRestore) return;
    setDraft(pendingRestore);
    setStep(pendingRestore.step ?? "photos");
    setShowRestorePrompt(false);
    setPendingRestore(null);
    await restoreTaxonomy(pendingRestore);
    void loadPickupPoints();
  }, [pendingRestore, restoreTaxonomy, loadPickupPoints]);

  const discardRestore = useCallback(async () => {
    await clearLotDraft();
    setDraft(EMPTY_LOT_DRAFT);
    setStep("photos");
    setShowRestorePrompt(false);
    setPendingRestore(null);
    void loadPickupPoints();
  }, [loadPickupPoints]);

  const priceNumber = useMemo(
    () => Number(draft.price.replace(/\s/g, "").replace(",", ".")),
    [draft.price],
  );
  const stockNumber = useMemo(() => {
    const n = Number(draft.stock.replace(/\s/g, ""));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }, [draft.stock]);

  const canContinuePhotos = draft.images.length > 0;
  const canContinueDetails =
    draft.title.trim().length >= 2 &&
    priceNumber > 0 &&
    draft.city.trim().length >= 2 &&
    Boolean(draft.productTypeId) &&
    (!draft.pickupEnabled || draft.pickupPointIds.length > 0);

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
    const nextImages = [...draft.images, ...result.assets.map((a) => ({ uri: a.uri }))].slice(0, 10);
    persist({ ...draft, images: nextImages, step: "photos" });
  }

  async function selectRootCategory(cat: { id: string; name: string }) {
    const browse = await fetchTaxonomyBrowse(cat.id);
    setSubcategories(browse.children ?? []);
    setProductTypes(browse.productTypes ?? []);
    persist({
      ...draft,
      categoryId: cat.id,
      categoryName: cat.name,
      productTypeId: null,
      productTypeName: null,
      step: "details",
    });
  }

  async function selectProductType(pt: { id: string; name: string }) {
    persist({
      ...draft,
      productTypeId: pt.id,
      productTypeName: pt.name,
      step: "details",
    });
  }

  function togglePickupEnabled(enabled: boolean) {
    persist({
      ...draft,
      pickupEnabled: enabled,
      pickupPointIds: enabled ? draft.pickupPointIds : [],
      step: "details",
    });
    if (enabled && pickupPoints.length === 0) void loadPickupPoints();
  }

  function togglePickupPoint(pointId: string) {
    const has = draft.pickupPointIds.includes(pointId);
    const pickupPointIds = has
      ? draft.pickupPointIds.filter((id) => id !== pointId)
      : [...draft.pickupPointIds, pointId];
    persist({ ...draft, pickupPointIds, step: "details" });
  }

  async function goPreview() {
    if (!canContinueDetails) {
      setError(LOT_CREATE_COPY.validationDetails);
      await flushSave(draft);
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
    persist(next, { immediate: true });
    setStep("preview");
    clearErrors();
  }

  function buildPayload(images: Array<{ url: string; pathname?: string | null }>, status: "ACTIVE" | "DRAFT") {
    return {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      price: priceNumber,
      city: draft.city.trim(),
      condition: draft.condition,
      productTypeId: draft.productTypeId,
      categoryId: draft.categoryId,
      images,
      stock: stockNumber,
      status,
      pickupEnabled: draft.pickupEnabled,
      pickupPointIds: draft.pickupPointIds,
    };
  }

  async function uploadImagesWithRecovery() {
    const images: Array<{ url: string; pathname?: string | null }> = [];
    const nextDraftImages = [...draft.images];
    for (let i = 0; i < draft.images.length; i++) {
      const img = draft.images[i];
      if (img.uploadedUrl) {
        images.push({ url: img.uploadedUrl, pathname: img.uploadedPathname ?? null });
        continue;
      }
      try {
        const uploaded = await uploadSellerLotImage(img.uri);
        images.push({ url: uploaded.url, pathname: uploaded.pathname });
        nextDraftImages[i] = {
          ...img,
          uploadedUrl: uploaded.url,
          uploadedPathname: uploaded.pathname ?? undefined,
        };
      } catch (err) {
        const saved = { ...draft, images: nextDraftImages };
        await flushSave(saved);
        setDraft(saved);
        lastFailedActionRef.current = "upload";
        uploadFailedRef.current = true;
        throw err;
      }
    }
    const saved = { ...draft, images: nextDraftImages };
    await flushSave(saved);
    setDraft(saved);
    return images;
  }

  async function saveLotLocallyAndServer() {
    setSavingLot(true);
    clearErrors();
    setInfo(null);
    lastFailedActionRef.current = "save";
    retryIntentRef.current = "save";
    uploadFailedRef.current = false;
    try {
      await flushSave(draft);
      const images = await uploadImagesWithRecovery();
      const created = await createSellerLot(buildPayload(images, "DRAFT"));
      const saved = { ...draft, savedProductId: created.product.id };
      await flushSave(saved);
      setDraft(saved);
      setInfo(LOT_CREATE_COPY.savedLocally);
    } catch (err) {
      await flushSave(draft);
      const context: LotCreateErrorContext = uploadFailedRef.current ? "upload" : "save";
      setHumanError(err, context);
    } finally {
      setSavingLot(false);
    }
  }

  async function publishLot() {
    setPublishing(true);
    clearErrors();
    setInfo(null);
    lastFailedActionRef.current = "publish";
    retryIntentRef.current = "publish";
    uploadFailedRef.current = false;
    try {
      const images = await uploadImagesWithRecovery();
      let productId: string | null = draft.savedProductId;
      let reviewNote: string | null = null;

      try {
        const created = await createSellerLot(buildPayload(images, "ACTIVE"));
        productId = created.product.id;
      } catch {
        const created = await createSellerLot(buildPayload(images, "DRAFT"));
        productId = created.product.id;
        reviewNote = LOT_CREATE_COPY.savedForReview;
      }

      setPublishedId(productId);
      setInfo(reviewNote);
      await clearLotDraft();
      setStep("success");
    } catch (err) {
      await flushSave(draft);
      const context: LotCreateErrorContext = uploadFailedRef.current ? "upload" : "publish";
      setHumanError(err, context);
    } finally {
      setPublishing(false);
    }
  }

  async function retryLastAction() {
    clearErrors();
    if (retryIntentRef.current === "save") {
      await saveLotLocallyAndServer();
      return;
    }
    await publishLot();
  }

  function goToStep(next: LotWizardStep) {
    setStep(next);
    persist({ ...draft, step: next === "success" ? draft.step : next }, { immediate: true });
  }

  return {
    step,
    draft,
    showRestorePrompt,
    autosaveStatus,
    rootCategories,
    subcategories,
    productTypes,
    pickupPoints,
    pickupLoadError,
    publishing,
    savingLot,
    publishedId,
    error,
    errorDetail,
    canRetry,
    info,
    priceNumber,
    stockNumber,
    canContinuePhotos,
    canContinueDetails,
    persist,
    continueRestore,
    discardRestore,
    pickImages,
    selectRootCategory,
    selectProductType,
    togglePickupEnabled,
    togglePickupPoint,
    loadPickupPoints,
    goPreview,
    saveLotLocallyAndServer,
    publishLot,
    retryLastAction,
    goToStep,
    setError,
    setInfo,
    setDraft,
    setStep,
    setPublishedId,
  };
}
