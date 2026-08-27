import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, InteractionManager } from "react-native";

import { buildPhotoStepUiContract } from "../../../../lib/mobile/seller-journey/photo-step-state";
import { createClientActionId, createOneTapGuard } from "../../../../lib/mobile/seller-journey/one-tap-action";

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
import { isFirebaseQaEnabled } from "../config/firebase-qa";
import { LOT_CREATE_COPY } from "./lot-create-copy";
import { formatLotCreateError, type LotCreateErrorContext } from "./lot-create-errors";
import {
  evaluateLotPreviewValidation,
  formatPreviewBlockersMessage,
  parseLotPriceNumber,
  parseLotStockNumber,
} from "./lot-preview-validation";
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
import { recordSellerJourneyEvent } from "./journey-diagnostics";

export type LotWizardStep = "photos" | "details" | "preview" | "success";
export type AutosaveStatus = "idle" | "saving" | "saved";

export function useLotCreateForm() {
  const draftRef = useRef<LotDraft>(EMPTY_LOT_DRAFT);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const characteristicsRequestRef = useRef(0);
  const uploadQueueRef = useRef<Promise<void> | null>(null);
  const continueGuardRef = useRef(createOneTapGuard());
  const publishGuardRef = useRef(createOneTapGuard());

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
  const [pickerBusy, setPickerBusy] = useState(false);
  const [continueInFlight, setContinueInFlight] = useState(false);
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
    if (uploadQueueRef.current) {
      await uploadQueueRef.current.catch(() => undefined);
    }

    const task = (async () => {
      for (let i = 0; i < draftRef.current.images.length; i++) {
        const img = draftRef.current.images[i];
        if (!img || img.uploadedUrl || img.uploadStatus === "uploading") continue;
        try {
          await uploadDraftImageAt(i);
        } catch {
          break;
        }
      }
    })();

    uploadQueueRef.current = task;
    try {
      await task;
    } finally {
      if (uploadQueueRef.current === task) uploadQueueRef.current = null;
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

  const photoStepUi = useMemo(
    () => buildPhotoStepUiContract(draft.images, { pickerBusy, continueInFlight }),
    [draft.images, pickerBusy, continueInFlight],
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

  const priceNumber = useMemo(() => parseLotPriceNumber(draft.price), [draft.price]);
  const stockNumber = useMemo(() => parseLotStockNumber(draft.stock), [draft.stock]);

  const previewValidation = useMemo(
    () =>
      evaluateLotPreviewValidation({
        title: draft.title,
        price: draft.price,
        stock: draft.stock,
        city: draft.city,
        categoryId: draft.categoryId,
        productTypeId: draft.productTypeId,
        imagesCount: draft.images.length,
        pickupEnabled: draft.pickupEnabled,
        pickupPointIds: draft.pickupPointIds,
        characteristicDefinitions,
        characteristicValues: draft.characteristicValues,
        imagesUploading,
        hasFailedUploads,
      }),
    [
      draft.title,
      draft.price,
      draft.stock,
      draft.city,
      draft.categoryId,
      draft.productTypeId,
      draft.images.length,
      draft.pickupEnabled,
      draft.pickupPointIds,
      draft.characteristicValues,
      characteristicDefinitions,
      imagesUploading,
      hasFailedUploads,
    ],
  );

  const canContinuePhotos = photoStepUi.canContinue;
  const canContinueDetails = previewValidation.canPreview;
  const previewBlockersMessage = formatPreviewBlockersMessage(previewValidation.previewBlockers);

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

    setPickerBusy(true);
    try {
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
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      void processUploadQueue();
    } finally {
      setPickerBusy(false);
    }
  }

  async function injectFixturePhoto(fixture: "smartphone" | "product") {
    if (!isFirebaseQaEnabled()) return;
    setPickerBusy(true);
    try {
      const moduleId =
        fixture === "smartphone"
          ? require("../firebase-qa-fixtures/smartphone-photo.png")
          : require("../firebase-qa-fixtures/product-photo.png");
      const resolved = Image.resolveAssetSource(moduleId);
      const uri = resolved.uri;
      if (!uri) {
        Alert.alert("QA fixture", "Не удалось загрузить тестовое фото");
        return;
      }
      const added = {
        uri,
        fileName: `${fixture}-fixture.png`,
        mimeType: "image/png",
        width: 48,
        height: 48,
        fileSize: 1024,
        uploadStatus: "idle" as const,
      };
      const current = draftRef.current;
      const nextImages = [...current.images, added].slice(0, 10);
      persist({ ...current, images: nextImages, step: "photos" }, { immediate: true });
      clearErrors();
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      void processUploadQueue();
    } finally {
      setPickerBusy(false);
    }
  }

  async function continueFromPhotos() {
    const actionId = createClientActionId("photo-continue");
    const readyUi = buildPhotoStepUiContract(draftRef.current.images, {
      pickerBusy,
      continueInFlight: false,
    });
    recordSellerJourneyEvent({
      screen: "photos",
      action: "continue",
      actionId,
      clientState: readyUi.phase,
    });
    if (!readyUi.canContinue || readyUi.ctaDisabled) {
      recordSellerJourneyEvent({
        screen: "photos",
        action: "continue",
        actionId,
        outcome: "VISIBLE_ERROR",
        errorCode: "NOT_READY",
        clientState: readyUi.phase,
      });
      return;
    }
    if (!continueGuardRef.current.tryBegin()) return;

    setContinueInFlight(true);
    try {
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      setStep("details");
      persist({ ...draftRef.current, step: "details" }, { immediate: true });
      recordSellerJourneyEvent({
        screen: "photos",
        action: "continue",
        actionId,
        outcome: "SUCCESS",
        clientState: "details",
      });
    } finally {
      setContinueInFlight(false);
      continueGuardRef.current.finish();
    }
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
    clearErrors();

    let working = { ...draftRef.current };
    if (!working.productTypeId && working.title.trim().length >= 2) {
      const suggestion = await suggestProductType(working.title);
      if (suggestion.productTypeId) {
        working = {
          ...working,
          productTypeId: suggestion.productTypeId,
          productTypeName: suggestion.productTypeName,
          categoryId: working.categoryId ?? suggestion.categoryId,
          categoryName: working.categoryName ?? suggestion.categoryName,
        };
        if (suggestion.productTypeId !== draftRef.current.productTypeId) {
          await loadCharacteristicsForProductType(suggestion.productTypeId, working.characteristicValues);
        }
        persist(working, { immediate: true });
      }
    }

    const validation = evaluateLotPreviewValidation({
      title: working.title,
      price: working.price,
      stock: working.stock,
      city: working.city,
      categoryId: working.categoryId,
      productTypeId: working.productTypeId,
      imagesCount: working.images.length,
      pickupEnabled: working.pickupEnabled,
      pickupPointIds: working.pickupPointIds,
      characteristicDefinitions,
      characteristicValues: working.characteristicValues,
      imagesUploading: working.images.some((img) => img.uploadStatus === "uploading"),
      hasFailedUploads: working.images.some((img) => img.uploadStatus === "failed" && !img.uploadedUrl),
    });

    if (!validation.canPreview) {
      const message = formatPreviewBlockersMessage(validation.previewBlockers) ?? LOT_CREATE_COPY.validationDetails;
      setError(message);
      setErrorDetail(
        validation.previewBlockers.length > 1
          ? validation.previewBlockers.map((b) => `• ${b.message}`).join("\n")
          : null,
      );
      setCanRetry(false);
      await flushSave(working);
      return;
    }

    persist({ ...working, step: "preview" }, { immediate: true });
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
    const stock = parseLotStockNumber(current.stock);
    return {
      title: current.title.trim(),
      description: current.description.trim() || null,
      price: priceNumber,
      city: current.city.trim(),
      condition: current.condition,
      productTypeId: current.productTypeId,
      categoryId: current.categoryId,
      images,
      stock: Number.isFinite(stock) && stock > 0 ? stock : 1,
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

  async function publishOnServer(
    images: Array<{ url: string; pathname?: string | null }>,
    actionId: string,
  ) {
    const draftPayload = buildPayload(images, "DRAFT");
    const activePayload = buildPayload(images, "ACTIVE");
    let productId: string | null = draftRef.current.savedProductId;

    try {
      if (productId) {
        await updateSellerLot(productId, draftPayload, `${actionId}-draft`);
      } else {
        const created = await createSellerLot(draftPayload, `${actionId}-create`);
        productId = created.product.id;
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CHARACTERISTICS_REQUIRED") {
        await handleCharacteristicRejection(err.code, err.message);
      }
      throw err;
    }

    try {
      const published = await publishSellerLot(productId, activePayload, `${actionId}-publish`);
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
    if (!publishGuardRef.current.tryBegin()) return;

    const actionId = createClientActionId("lot-submit");
    const startedAt = Date.now();
    recordSellerJourneyEvent({
      screen: "preview",
      action: "submit",
      actionId,
      productId: draftRef.current.savedProductId,
      clientState: "SUBMITTING",
    });

    if (draftRef.current.images.some((img) => img.uploadStatus === "uploading")) {
      setError(LOT_CREATE_COPY.uploadWaitPublish);
      setErrorDetail(null);
      setCanRetry(false);
      recordSellerJourneyEvent({
        screen: "preview",
        action: "submit",
        actionId,
        outcome: "VISIBLE_ERROR",
        errorCode: "UPLOAD_IN_PROGRESS",
        durationMs: Date.now() - startedAt,
      });
      publishGuardRef.current.finish();
      return;
    }
    if (draftRef.current.images.some((img) => img.uploadStatus === "failed" && !img.uploadedUrl)) {
      setHumanError(new Error(LOT_CREATE_COPY.uploadErrorTitle), "upload");
      recordSellerJourneyEvent({
        screen: "preview",
        action: "submit",
        actionId,
        outcome: "VISIBLE_ERROR",
        errorCode: "UPLOAD_FAILED",
        durationMs: Date.now() - startedAt,
      });
      publishGuardRef.current.finish();
      return;
    }

    const submitCheck = evaluateLotPreviewValidation({
      title: draftRef.current.title,
      price: draftRef.current.price,
      stock: draftRef.current.stock,
      city: draftRef.current.city,
      categoryId: draftRef.current.categoryId,
      productTypeId: draftRef.current.productTypeId,
      imagesCount: draftRef.current.images.length,
      pickupEnabled: draftRef.current.pickupEnabled,
      pickupPointIds: draftRef.current.pickupPointIds,
      characteristicDefinitions,
      characteristicValues: draftRef.current.characteristicValues,
    });
    const charBlockers = submitCheck.submitBlockers.filter((b) => b.code === "CHARACTERISTIC_MISSING");
    if (charBlockers.length > 0) {
      const issues = validateLotCharacteristicForm(
        characteristicDefinitions,
        draftRef.current.characteristicValues,
        { onlyRequired: true },
      );
      setHighlightedCharacteristicIds(new Set(issues.map((issue) => issue.definitionId)));
      setError(humanCharacteristicMissingMessage(issues));
      setErrorDetail(issues.length === 1 ? issues[0]!.message : null);
      setCanRetry(false);
      setStep("details");
      persist({ ...draftRef.current, step: "details" }, { immediate: true });
      recordSellerJourneyEvent({
        screen: "preview",
        action: "submit",
        actionId,
        outcome: "VISIBLE_ERROR",
        errorCode: "CHARACTERISTIC_MISSING",
        durationMs: Date.now() - startedAt,
      });
      publishGuardRef.current.finish();
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
      const { productId, outcome } = await publishOnServer(images, actionId);

      setPublishedId(productId);
      setPublishOutcome(outcome);
      setInfo(null);
      await clearLotDraft();
      setStep("success");
      recordSellerJourneyEvent({
        screen: "preview",
        action: "submit",
        actionId,
        productId,
        outcome: "SUCCESS",
        clientState: outcome,
        httpRoute: "/api/mobile/seller/products",
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CHARACTERISTICS_REQUIRED") {
        recordSellerJourneyEvent({
          screen: "preview",
          action: "submit",
          actionId,
          outcome: "VISIBLE_ERROR",
          errorCode: err.code,
          durationMs: Date.now() - startedAt,
        });
        return;
      }
      await flushSave(draftRef.current);
      const context: LotCreateErrorContext = uploadFailedRef.current ? "upload" : "publish";
      setHumanError(err, context);
      recordSellerJourneyEvent({
        screen: "preview",
        action: "submit",
        actionId,
        productId: draftRef.current.savedProductId,
        outcome: "VISIBLE_ERROR",
        errorCode: err instanceof ApiClientError ? err.code : "UNKNOWN",
        durationMs: Date.now() - startedAt,
      });
    } finally {
      setPublishing(false);
      publishGuardRef.current.finish();
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
    photoStepUi,
    previewValidation,
    previewBlockersMessage,
    imagesUploading,
    hasFailedUploads,
    continueFromPhotos,
    continueInFlight,
    persist,
    continueRestore,
    discardRestore,
    pickImages,
    injectFixturePhoto,
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
