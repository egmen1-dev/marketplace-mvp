import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";

import { getCommerceUseCases } from "../../../composition/commerce-container";
import type { SellerCategoryOption, SellerProductEditorImage } from "../../../domain/contracts/entities/seller";
import { domainErrorMessage } from "../../../domain/errors/error-factory";
import { productId } from "../../../domain/contracts/value-objects/ids";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { readSnapshot, saveSnapshot } from "../../../storage/offline-cache";
import { useAppStore } from "../../../store/app-store";
import {
  editorToForm,
  formToEditorInput,
  validateEditorForm,
  type SellerProductEditorForm,
} from "./seller-product-editor-view";

const AUTOSAVE_MS = 1800;

type Snapshot = {
  productId: string | null;
  form: SellerProductEditorForm;
};

export function useSellerProductEditor(initialProductId: string | null) {
  const commerce = getCommerceUseCases();
  const offline = useAppStore((s) => s.offline);
  const snapshotKey = `seller-product-editor-${initialProductId ?? "new"}`;

  const [productIdValue, setProductIdValue] = useState<string | null>(initialProductId);
  const [form, setForm] = useState<SellerProductEditorForm | null>(null);
  const [categories, setCategories] = useState<SellerCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const lastSavedRef = useRef<SellerProductEditorForm | null>(null);
  const debouncedForm = useDebouncedValue(form, AUTOSAVE_MS);

  const validation = useMemo(() => (form ? validateEditorForm(form) : null), [form]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const cached = readSnapshot<Snapshot>(snapshotKey)?.payload;
    const [editorResult, categoriesResult] = await Promise.all([
      commerce.loadSellerProductEditor.execute({
        productId: initialProductId ? productId(initialProductId) : null,
      }),
      commerce.loadSellerCategories.execute({}),
    ]);

    if (categoriesResult.ok) setCategories([...categoriesResult.value]);

    if (editorResult.ok) {
      const nextForm = cached?.form && (!initialProductId || cached.productId === initialProductId)
        ? cached.form
        : editorToForm(editorResult.value);
      setForm(nextForm);
      lastSavedRef.current = editorResult.value.id ? nextForm : null;
      setFromCache(Boolean(cached?.form));
      if (!productIdValue && editorResult.value.id) {
        setProductIdValue(String(editorResult.value.id));
      }
    } else if (cached?.form) {
      setForm(cached.form);
      setFromCache(true);
    } else {
      setError(domainErrorMessage(editorResult.error));
    }
    setLoading(false);
  }, [commerce.loadSellerCategories, commerce.loadSellerProductEditor, initialProductId, productIdValue, snapshotKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistLocal = useCallback(
    (nextForm: SellerProductEditorForm) => {
      saveSnapshot(snapshotKey, { productId: productIdValue, form: nextForm });
    },
    [productIdValue, snapshotKey],
  );

  const patchForm = useCallback(
    (patch: Partial<SellerProductEditorForm>) => {
      setForm((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        persistLocal(next);
        return next;
      });
    },
    [persistLocal],
  );

  const save = useCallback(
    async (options?: { forceDraft?: boolean; redirect?: boolean }) => {
      if (!form) return null;
      const check = validateEditorForm(form);
      if (!check.ok && !options?.forceDraft) {
        setError(check.message);
        return null;
      }
      if (offline) {
        setError("Сохранение недоступно офлайн");
        return null;
      }

      setSaving(true);
      setError(null);
      setSaveMessage(null);
      const input = formToEditorInput(form, options?.forceDraft ?? false);
      const result = await commerce.saveSellerProduct.execute({
        productId: productIdValue ? productId(productIdValue) : null,
        input,
      });
      setSaving(false);

      if (!result.ok) {
        setError(domainErrorMessage(result.error));
        commerce.trackScreenEvent({ screen: "seller_product_editor", event: "seller_product_save_error" });
        return null;
      }

      const savedId = String(result.value.id);
      setProductIdValue(savedId);
      lastSavedRef.current = form;
      setSaveMessage(result.value.moderationPending ? "Отправлено на модерацию" : "Сохранено");
      commerce.trackScreenEvent({ screen: "seller_product_editor", event: "seller_product_saved" });
      persistLocal(form);

      if (options?.redirect && !initialProductId) {
        router.replace(`/seller/product/${savedId}/edit`);
      }
      return result.value;
    },
    [commerce, form, initialProductId, offline, persistLocal, productIdValue],
  );

  useEffect(() => {
    if (!debouncedForm || loading || saving || offline) return;
    if (!debouncedForm.title.trim()) return;
    const price = Number(debouncedForm.price.replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) return;
    if (lastSavedRef.current && JSON.stringify(lastSavedRef.current) === JSON.stringify(debouncedForm)) return;

    void (async () => {
      setAutosaving(true);
      const saved = await save({ forceDraft: true });
      if (saved) lastSavedRef.current = debouncedForm;
      setAutosaving(false);
      commerce.trackScreenEvent({ screen: "seller_product_editor", event: "seller_product_autosaved" });
    })();
  }, [commerce, debouncedForm, loading, offline, save, saving]);

  const undo = useCallback(() => {
    if (lastSavedRef.current) {
      setForm(lastSavedRef.current);
      persistLocal(lastSavedRef.current);
      commerce.trackScreenEvent({ screen: "seller_product_editor", event: "seller_product_undo" });
    }
  }, [commerce, persistLocal]);

  const uploadImage = useCallback(async () => {
    const { pickProductImage } = await import("../../camera/media-permissions");
    const uri = await pickProductImage();
    if (!uri || !form) return;
    setUploadingImage(true);
    setError(null);
    const result = await commerce.uploadSellerProductImage.execute({ localUri: uri });
    setUploadingImage(false);
    if (!result.ok) {
      setError(domainErrorMessage(result.error));
      return;
    }
    const image: SellerProductEditorImage = {
      url: result.value.url,
      pathname: result.value.pathname,
      alt: form.title || null,
      isPrimary: form.images.length === 0,
    };
    patchForm({ images: [...form.images, image] });
    commerce.trackScreenEvent({ screen: "seller_product_editor", event: "seller_product_image_uploaded" });
  }, [commerce, form, patchForm]);

  const removeImage = useCallback(
    (url: string) => {
      if (!form) return;
      const next = form.images.filter((img) => img.url !== url);
      if (next.length > 0 && !next.some((img) => img.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      patchForm({ images: next });
    },
    [form, patchForm],
  );

  const setPrimaryImage = useCallback(
    (url: string) => {
      if (!form) return;
      patchForm({
        images: form.images.map((img) => ({ ...img, isPrimary: img.url === url })),
      });
    },
    [form, patchForm],
  );

  const selectCategory = useCallback(
    (category: SellerCategoryOption) => {
      patchForm({ categoryId: category.id, categoryName: category.name, productTypeId: null, productTypeName: null, characteristics: [] });
    },
    [patchForm],
  );

  const loadProductTypes = useCallback(
    async (categoryId: string) => {
      const result = await commerce.loadSellerTaxonomyBrowse.execute({ categoryId });
      return result.ok ? result.value.productTypes : [];
    },
    [commerce.loadSellerTaxonomyBrowse],
  );

  const selectProductType = useCallback(
    async (type: { id: string; name: string; categoryId: string }) => {
      const result = await commerce.loadSellerTaxonomyBrowse.execute({ productTypeId: type.id });
      if (!result.ok) return;
      patchForm({
        productTypeId: type.id,
        productTypeName: type.name,
        categoryId: type.categoryId,
        characteristics: (result.value.characteristics ?? []).map((c) => ({
          definitionId: c.definitionId,
          name: c.name,
          required: c.required,
          type: c.type,
          unit: c.unit,
          options: c.options ? [...c.options] : null,
          value: "",
        })),
      });
    },
    [commerce.loadSellerTaxonomyBrowse, patchForm],
  );

  return {
    form,
    categories,
    loading,
    saving,
    autosaving,
    uploadingImage,
    error,
    saveMessage,
    fromCache,
    validation,
    productId: productIdValue,
    patchForm,
    save,
    undo,
    uploadImage,
    removeImage,
    setPrimaryImage,
    selectCategory,
    loadProductTypes,
    selectProductType,
    refresh: load,
  };
}
