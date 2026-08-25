import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

import type { LotCharacteristicDefinition, LotCharacteristicFormValue } from "./lot-characteristics";
import {
  formatCharacteristicPreviewValue,
  humanCharacteristicMissingMessage,
  mapServerCharacteristicRejection,
  pruneCharacteristicValuesForSchema,
  serializeLotCharacteristicPayload,
  validateLotCharacteristicForm,
} from "./lot-characteristics";

import { ApiClientError } from "../api/client";
import {
  createSellerLot,
  fetchProductTypeCharacteristicsCompat,
  fetchSellerPickupPoints,
  fetchTaxonomyBrowse,
  publishSellerLot,
  suggestProductType,
  updateSellerLot,
  type SellerLotMutationResponse,
} from "../api/seller-lot";
import { loadAppConfig } from "../config/env";
import { LOT_CREATE_COPY } from "./lot-create-copy";
import { formatLotCreateError, type LotCreateErrorContext } from "./lot-create-errors";
import {
  resolveLotPublishOutcome,
  type LotPublishOutcome,
} from "./resolve-lot-publish-outcome";
import {
  EMPTY_LOT_DRAFT,
  clearLotDraft,
  isUnfinishedLot,
  loadLotDraft,
  saveLotDraft,
  type LotDraft,
  type LotDraftImage,
} from "./lot-draft-storage";
import { normalizeDraftImageAsset, normalizeImagePickerAsset } from "./normalize-image-picker-asset";
import { uploadSellerLotImage } from "./upload-seller-lot-image";
import type { SellerPickupPoint } from "../api/seller-lot";

export type LotWizardStep = "photos" | "details" | "preview" | "success";
export type AutosaveStatus = "idle" | "saving" | "saved";

export function useLotCreateForm() {
  const draftRef = useRef<LotDraft>(EMPTY_LOT_DRAFT);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const characteristicsRequestRef = useRef(0);

  const [step, setStep] = useState<LotWizardStep>("photos");
  const [draft, setDraft] = useState<LotDraft>(EMPTY_LOT_DRAFT);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<LotDraft | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [rootCategories, setRootCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string }>>([]);
  const [productTypes, setProductTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [characteristicDefinitions, setCharacteristicDefinitions] = useState<LotCharacteristicDefinition[]>([]);
  const [characteristicsLoading, setCharacteristicsLoading] = useState(false);
  const [highlightedCharacteristicIds, setHighlightedCharacteristicIds] = useState<Set<string>>(new Set());
  const [pickupPoints, setPickupPoints] = useState<SellerPickupPoint[]>([]);
  const [pickupLoadError, setPickupLoadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [savingLot, setSavingLot] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publishOutcome, setPublishOutcome] = useState<LotPublishOutcome | null>(null);
  const [publishCtaLabel, setPublishCtaLabel] = useState<string>(LOT_CREATE_COPY.publishLabel);
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
      draftRef.current = next;
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

  const loadCharacteristicsForProductType = useCallback(
    async (productTypeId: string | null, existingValues?: Record<string, LotCharacteristicFormValue>) => {
      if (!productTypeId) {
        setCharacteristicDefinitions([]);
        return;
      }

      const requestId = ++characteristicsRequestRef.current;
      setCharacteristicsLoading(true);
      try {
        const response = await fetchProductTypeCharacteristicsCompat(productTypeId);
        if (requestId !== characteristicsRequestRef.current) return;

        const defs = response.characteristics ?? [];
        setCharacteristicDefinitions(defs);

        const pruned = pruneCharacteristicValuesForSchema(defs, existingValues ?? draftRef.current.characteristicValues);
        if (draftRef.current.productTypeId === productTypeId) {
          persist(
            {
              ...draftRef.current,
              characteristicsProductTypeId: productTypeId,
              characteristicValues: pruned,
            },
            { immediate: true },
          );
        }
      } catch {
        if (requestId === characteristicsRequestRef.current) {
          setCharacteristicDefinitions([]);
        }
      } finally {
        if (requestId === characteristicsRequestRef.current) {
          setCharacteristicsLoading(false);
        }
      }
    },
    [persist],
  );

  const patchDraftImages = useCallback(
    (updater: (images: LotDraftImage[]) => LotDraftImage[], options?: { immediate?: boolean }) => {
      const next = { ...draftRef.current, images: updater(draftRef.current.images), step: draftRef.current.step };
      persist(next, options);
      return next;
    },
    [persist],
  );

  const uploadDraftImageAt = useCallback(
    async (index: number) => {
      const current = draftRef.current.images[index];
      if (!current || current.uploadedUrl || current.uploadStatus === "uploading") return;

      patchDraftImages((images) =>
        images.map((img, i) => (i === index ? { ...img, uploadStatus: "uploading", uploadError: null } : img)),
        { immediate: true },
      );

      try {
        const uploaded = await uploadSellerLotImage(normalizeDraftImageAsset(current));
        patchDraftImages((images) =>
          images.map((img, i) =>
            i === index
              ? {
                  ...img,
                  uploadStatus: "uploaded",
                  uploadError: null,
                  uploadedUrl: uploaded.url,
                  uploadedPathname: uploaded.pathname ?? undefined,
                  uploadedId: uploaded.id,
                  mimeType: uploaded.mimeType,
                }
              : img,
          ),
          { immediate: true },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : LOT_CREATE_COPY.uploadErrorTitle;
        patchDraftImages((images) =>
          images.map((img, i) =>
            i === index ? { ...img, uploadStatus: "failed", uploadError: message } : img,
          ),
          { immediate: true },
        );
        uploadFailedRef.current = true;
        lastFailedActionRef.current = "upload";
        throw err;
      }
    },
    [patchDraftImages],
  );

  const processUploadQueue = useCallback(async () => {
    const images = draftRef.current.images;
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.uploadedUrl || img.uploadStatus === "uploading") continue;
      try {
        await uploadDraftImageAt(i);
      } catch {
        break;
      }
    }
  }, [uploadDraftImageAt]);

  const imagesUploading = useMemo(
    () => draft.images.some((img) => img.uploadStatus === "uploading"),
    [draft.images],
  );

  const hasFailedUploads = useMemo(
    () => draft.images.some((img) => img.uploadStatus === "failed" && !img.uploadedUrl),
    [draft.images],
  );

  const characteristicPreviewRows = useMemo(() => {
    return characteristicDefinitions
      .map((def) => {
        const display = formatCharacteristicPreviewValue(def, draft.characteristicValues[def.id]);
        if (!display) return null;
        return { name: def.name, value: display };
      })
      .filter((row): row is { name: string; value: string } => Boolean(row));
  }, [characteristicDefinitions, draft.characteristicValues]);

  const requiredCharacteristicIssues = useMemo(
    () => validateLotCharacteristicForm(characteristicDefinitions, draft.characteristicValues, { onlyRequired: true }),
    [characteristicDefinitions, draft.characteristicValues],
  );

  useEffect(() => {
    const config = loadAppConfig();
    fetch(`${config.apiBaseUrl}/api/mobile/bootstrap`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        const label = payload?.sellerPublish?.publishCtaLabel;
        if (typeof label === "string" && label.trim()) {
          setPublishCtaLabel(label);
        }
      })
      .catch(() => {
        // keep default CTA
      });
  }, []);

  useEffect(() => {
    if (!draft.productTypeId) {
      setCharacteristicDefinitions([]);
      return;
    }
    if (draft.characteristicsProductTypeId === draft.productTypeId && characteristicDefinitions.length > 0) {
      return;
    }
    void loadCharacteristicsForProductType(draft.productTypeId, draft.characteristicValues);
  }, [draft.productTypeId, draft.characteristicsProductTypeId, draft.characteristicValues, characteristicDefinitions.length, loadCharacteristicsForProductType]);

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
    if (saved.productTypeId) {
      await loadCharacteristicsForProductType(saved.productTypeId, saved.characteristicValues);
    }
  }, [loadCharacteristicsForProductType]);

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
    draftRef.current = pendingRestore;
    setDraft(pendingRestore);
    setStep(pendingRestore.step ?? "photos");
    setShowRestorePrompt(false);
    setPendingRestore(null);
    await restoreTaxonomy(pendingRestore);
    void loadPickupPoints();
    void processUploadQueue();
  }, [pendingRestore, restoreTaxonomy, loadPickupPoints, processUploadQueue]);

  const discardRestore = useCallback(async () => {
    await clearLotDraft();
    setDraft(EMPTY_LOT_DRAFT);
    setStep("photos");
    setShowRestorePrompt(false);
    setPendingRestore(null);
    setCharacteristicDefinitions([]);
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
    requiredCharacteristicIssues.length === 0 &&
    (!draft.pickupEnabled || draft.pickupPointIds.length > 0);

  function updateCharacteristicValue(definitionId: string, value: LotCharacteristicFormValue) {
    const nextValues = { ...draftRef.current.characteristicValues, [definitionId]: value };
    persist({ ...draftRef.current, characteristicValues: nextValues, step: "details" });
    if (highlightedCharacteristicIds.has(definitionId)) {
      const nextHighlighted = new Set(highlightedCharacteristicIds);
      nextHighlighted.delete(definitionId);
      setHighlightedCharacteristicIds(nextHighlighted);
    }
  }

  function toggleOptionalCharacteristics() {
    persist({
      ...draftRef.current,
      showOptionalCharacteristics: !draftRef.current.showOptionalCharacteristics,
      step: "details",
    });
  }

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
    const added = result.assets.map((asset) => {
      const normalized = normalizeImagePickerAsset(asset);
      return {
        uri: normalized.uri,
        fileName: normalized.fileName,
        mimeType: normalized.mimeType,
        width: normalized.width,
        height: normalized.height,
        fileSize: normalized.fileSize,
        uploadStatus: "idle" as const,
      };
    });
    const current = draftRef.current;
    const nextImages = [...current.images, ...added].slice(0, 10);
    persist({ ...current, images: nextImages, step: "photos" }, { immediate: true });
    clearErrors();
    void processUploadQueue();
  }

  async function selectRootCategory(cat: { id: string; name: string }) {
    const browse = await fetchTaxonomyBrowse(cat.id);
    setSubcategories(browse.children ?? []);
    setProductTypes(browse.productTypes ?? []);
    setCharacteristicDefinitions([]);
    setHighlightedCharacteristicIds(new Set());
    persist({
      ...draftRef.current,
      categoryId: cat.id,
      categoryName: cat.name,
      productTypeId: null,
      productTypeName: null,
      characteristicsProductTypeId: null,
      characteristicValues: {},
      showOptionalCharacteristics: false,
      step: "details",
    });
  }

  async function selectProductType(pt: { id: string; name: string }) {
    setHighlightedCharacteristicIds(new Set());
    persist({
      ...draftRef.current,
      productTypeId: pt.id,
      productTypeName: pt.name,
      characteristicsProductTypeId: null,
      step: "details",
    });
    await loadCharacteristicsForProductType(pt.id, draftRef.current.characteristicValues);
  }

  function togglePickupEnabled(enabled: boolean) {
    persist({
      ...draftRef.current,
      pickupEnabled: enabled,
      pickupPointIds: enabled ? draftRef.current.pickupPointIds : [],
      step: "details",
    });
    if (enabled && pickupPoints.length === 0) void loadPickupPoints();
  }

  function togglePickupPoint(pointId: string) {
    const has = draftRef.current.pickupPointIds.includes(pointId);
    const pickupPointIds = has
      ? draftRef.current.pickupPointIds.filter((id) => id !== pointId)
      : [...draftRef.current.pickupPointIds, pointId];
    persist({ ...draftRef.current, pickupPointIds, step: "details" });
  }

  async function handleCharacteristicRejection(code: string | undefined, message: string) {
    const productTypeId = draftRef.current.productTypeId;
    let defs = characteristicDefinitions;
    if (productTypeId) {
      try {
        const refreshed = await fetchProductTypeCharacteristicsCompat(productTypeId);
        defs = refreshed.characteristics ?? [];
        setCharacteristicDefinitions(defs);
      } catch {
        // keep current defs
      }
    }

    const mapped = mapServerCharacteristicRejection(code, message, defs);
    setHighlightedCharacteristicIds(new Set(mapped.issues.map((issue) => issue.definitionId)));
    setError(mapped.userMessage);
    setErrorDetail(null);
    setCanRetry(true);
    lastFailedActionRef.current = "publish";
    setStep("details");
    persist({ ...draftRef.current, step: "details" }, { immediate: true });
  }

  async function goPreview() {
    if (!draftRef.current.title.trim() || priceNumber <= 0 || !draftRef.current.city.trim() || !draftRef.current.productTypeId) {
      setError(LOT_CREATE_COPY.validationDetails);
      await flushSave(draftRef.current);
      return;
    }

    if (draftRef.current.pickupEnabled && draftRef.current.pickupPointIds.length === 0) {
      setError(LOT_CREATE_COPY.pickupSaveError);
      await flushSave(draftRef.current);
      return;
    }

    const issues = validateLotCharacteristicForm(characteristicDefinitions, draftRef.current.characteristicValues, {
      onlyRequired: true,
    });
    if (issues.length > 0) {
      setHighlightedCharacteristicIds(new Set(issues.map((issue) => issue.definitionId)));
      setError(humanCharacteristicMissingMessage(issues));
      setErrorDetail(issues.length === 1 ? issues[0]!.message : null);
      setCanRetry(false);
      await flushSave(draftRef.current);
      return;
    }

    const suggestion = await suggestProductType(draftRef.current.title);
    const nextProductTypeId = draftRef.current.productTypeId ?? suggestion.productTypeId;
    if (nextProductTypeId && nextProductTypeId !== draftRef.current.productTypeId) {
      await loadCharacteristicsForProductType(nextProductTypeId, draftRef.current.characteristicValues);
    }

    const next = {
      ...draftRef.current,
      productTypeId: nextProductTypeId,
      productTypeName: draftRef.current.productTypeName ?? suggestion.productTypeName,
      categoryId: draftRef.current.categoryId ?? suggestion.categoryId,
      categoryName: draftRef.current.categoryName ?? suggestion.categoryName,
      step: "preview" as const,
    };
    persist(next, { immediate: true });
    setStep("preview");
    clearErrors();
    setHighlightedCharacteristicIds(new Set());
  }

  function buildPayload(images: Array<{ url: string; pathname?: string | null }>, status: "ACTIVE" | "DRAFT") {
    const current = draftRef.current;
    const characteristics = serializeLotCharacteristicPayload(
      characteristicDefinitions,
      current.characteristicValues,
    );
    return {
      title: current.title.trim(),
      description: current.description.trim() || null,
      price: priceNumber,
      city: current.city.trim(),
      condition: current.condition,
      productTypeId: current.productTypeId,
      categoryId: current.categoryId,
      images,
      stock: stockNumber,
      status,
      pickupEnabled: current.pickupEnabled,
      pickupPointIds: current.pickupPointIds,
      characteristics,
    };
  }

  async function uploadImagesWithRecovery() {
    const images: Array<{ url: string; pathname?: string | null }> = [];
    const nextDraftImages = [...draftRef.current.images];

    for (let i = 0; i < nextDraftImages.length; i++) {
      const img = nextDraftImages[i];
      if (img.uploadedUrl) {
        images.push({ url: img.uploadedUrl, pathname: img.uploadedPathname ?? null });
        continue;
      }

      try {
        await uploadDraftImageAt(i);
        const refreshed = draftRef.current.images[i];
        if (!refreshed?.uploadedUrl) {
          throw new Error(LOT_CREATE_COPY.uploadErrorTitle);
        }
        images.push({ url: refreshed.uploadedUrl, pathname: refreshed.uploadedPathname ?? null });
        nextDraftImages[i] = refreshed;
      } catch (err) {
        await flushSave({ ...draftRef.current, images: nextDraftImages });
        setDraft({ ...draftRef.current, images: nextDraftImages });
        uploadFailedRef.current = true;
        lastFailedActionRef.current = "upload";
        throw err;
      }
    }

    const saved = { ...draftRef.current, images: nextDraftImages };
    await flushSave(saved);
    setDraft(saved);
    return images;
  }

  async function persistServerDraft(images: Array<{ url: string; pathname?: string | null }>) {
    const payload = buildPayload(images, "DRAFT");
    if (draftRef.current.savedProductId) {
      await updateSellerLot(draftRef.current.savedProductId, payload);
      return draftRef.current.savedProductId;
    }
    const created = await createSellerLot(payload);
    return created.product.id;
  }

  function mapMutationOutcome(response: SellerLotMutationResponse): LotPublishOutcome {
    if (response.publishOutcome) return response.publishOutcome;
    return resolveLotPublishOutcome({
      id: response.id,
      status: response.status ?? response.product.status ?? "DRAFT",
      moderationState: response.moderationState ?? null,
      isPublic: response.isPublic,
    });
  }

  async function publishOnServer(images: Array<{ url: string; pathname?: string | null }>) {
    const draftPayload = buildPayload(images, "DRAFT");
    const activePayload = buildPayload(images, "ACTIVE");
    let productId: string | null = draftRef.current.savedProductId;

    if (productId) {
      await updateSellerLot(productId, draftPayload);
    } else {
      const created = await createSellerLot(draftPayload);
      productId = created.product.id;
    }

    try {
      const published = await publishSellerLot(productId, activePayload);
      const outcome = mapMutationOutcome(published);
      return { productId, outcome, response: published };
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CHARACTERISTICS_REQUIRED") {
        await handleCharacteristicRejection(err.code, err.message);
      }
      throw err;
    }
  }

  async function saveLotLocallyAndServer() {
    if (draftRef.current.images.some((img) => img.uploadStatus === "uploading")) {
      setError(LOT_CREATE_COPY.uploadWaitPublish);
      setErrorDetail(null);
      setCanRetry(false);
      return;
    }
    if (draftRef.current.images.some((img) => img.uploadStatus === "failed" && !img.uploadedUrl)) {
      setHumanError(new Error(LOT_CREATE_COPY.uploadErrorTitle), "upload");
      return;
    }

    setSavingLot(true);
    clearErrors();
    setInfo(null);
    lastFailedActionRef.current = "save";
    retryIntentRef.current = "save";
    uploadFailedRef.current = false;
    try {
      await flushSave(draftRef.current);
      const images = await uploadImagesWithRecovery();
      const productId = await persistServerDraft(images);
      const saved = { ...draftRef.current, savedProductId: productId };
      await flushSave(saved);
      setDraft(saved);
      setInfo(LOT_CREATE_COPY.savedLocally);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CHARACTERISTICS_REQUIRED") {
        await handleCharacteristicRejection(err.code, err.message);
        return;
      }
      await flushSave(draftRef.current);
      const context: LotCreateErrorContext = uploadFailedRef.current ? "upload" : "save";
      setHumanError(err, context);
    } finally {
      setSavingLot(false);
    }
  }

  async function publishLot() {
    if (draftRef.current.images.some((img) => img.uploadStatus === "uploading")) {
      setError(LOT_CREATE_COPY.uploadWaitPublish);
      setErrorDetail(null);
      setCanRetry(false);
      return;
    }
    if (draftRef.current.images.some((img) => img.uploadStatus === "failed" && !img.uploadedUrl)) {
      setHumanError(new Error(LOT_CREATE_COPY.uploadErrorTitle), "upload");
      return;
    }

    setPublishing(true);
    clearErrors();
    setInfo(null);
    setPublishOutcome(null);
    lastFailedActionRef.current = "publish";
    retryIntentRef.current = "publish";
    uploadFailedRef.current = false;
    try {
      const images = await uploadImagesWithRecovery();
      const { productId, outcome } = await publishOnServer(images);

      setPublishedId(productId);
      setPublishOutcome(outcome);
      setInfo(null);
      await clearLotDraft();
      setStep("success");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CHARACTERISTICS_REQUIRED") {
        return;
      }
      await flushSave(draftRef.current);
      const context: LotCreateErrorContext = uploadFailedRef.current ? "upload" : "publish";
      setHumanError(err, context);
    } finally {
      setPublishing(false);
    }
  }

  async function retryLastAction() {
    clearErrors();
    if (lastFailedActionRef.current === "upload" || hasFailedUploads) {
      uploadFailedRef.current = false;
      try {
        await processUploadQueue();
        if (retryIntentRef.current === "save") {
          await saveLotLocallyAndServer();
        } else if (!hasFailedUploads) {
          await publishLot();
        }
      } catch (err) {
        setHumanError(err, "upload");
      }
      return;
    }
    if (retryIntentRef.current === "save") {
      await saveLotLocallyAndServer();
      return;
    }
    await publishLot();
  }

  function goToStep(next: LotWizardStep) {
    setStep(next);
    persist({ ...draftRef.current, step: next === "success" ? draftRef.current.step : next }, { immediate: true });
  }

  return {
    step,
    draft,
    showRestorePrompt,
    autosaveStatus,
    rootCategories,
    subcategories,
    productTypes,
    characteristicDefinitions,
    characteristicsLoading,
    highlightedCharacteristicIds,
    characteristicPreviewRows,
    pickupPoints,
    pickupLoadError,
    publishing,
    savingLot,
    publishedId,
    publishOutcome,
    publishCtaLabel,
    error,
    errorDetail,
    canRetry,
    info,
    priceNumber,
    stockNumber,
    canContinuePhotos,
    canContinueDetails,
    imagesUploading,
    hasFailedUploads,
    persist,
    continueRestore,
    discardRestore,
    pickImages,
    selectRootCategory,
    selectProductType,
    togglePickupEnabled,
    togglePickupPoint,
    updateCharacteristicValue,
    toggleOptionalCharacteristics,
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
