import { useCallback, useEffect, useState } from "react";

import { addToCart, fetchCatalog, fetchProduct, postTelemetry, toggleFavorite, type MobileProductListItem } from "../../api/endpoints";
import { cacheProductDetail, loadCachedProductDetail } from "../../storage/product-detail-cache";
import { trackRecentView } from "../../storage/recent-views";
import { useAppStore } from "../../store/app-store";
import { mergeSellerProductCount, parseProductDetail, type ProductDetailView, type RelatedProduct } from "./types";

export type ProductDetailState = {
  product: ProductDetailView | null;
  related: RelatedProduct[];
  relatedFailed: boolean;
  loading: boolean;
  fromCache: boolean;
  offlineBlocked: boolean;
  error: string | null;
  isFavorite: boolean;
  favoriteBusy: boolean;
  cartMessage: string | null;
  addingToCart: boolean;
  cartSuccess: boolean;
  onAddToCart: () => Promise<void>;
  onToggleFavorite: () => Promise<void>;
  onShare: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useProductDetailData(productId: string | undefined): ProductDetailState {
  const offline = useAppStore((s) => s.offline);
  const [product, setProduct] = useState<ProductDetailView | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [relatedFailed, setRelatedFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [offlineBlocked, setOfflineBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);

  const loadRelated = useCallback(async (view: ProductDetailView) => {
    if (!view.categoryId) {
      setRelated([]);
      setRelatedFailed(false);
      return;
    }
    try {
      const res = await fetchCatalog({ sort: "popular", categoryId: view.categoryId });
      const items = res.items.filter((item) => item.id !== view.id).slice(0, 8);
      setRelated(items);
      setRelatedFailed(false);
    } catch {
      setRelated([]);
      setRelatedFailed(true);
    }
  }, []);

  const loadSellerCount = useCallback(async (view: ProductDetailView) => {
    if (!view.seller?.id) return view;
    try {
      const res = await fetchCatalog({ sellerId: view.seller.id, sort: "popular" });
      const count = res.items.length + (res.hasMore ? 1 : 0);
      return mergeSellerProductCount(view, count > 0 ? count : null);
    } catch {
      return view;
    }
  }, []);

  const loadProduct = useCallback(async () => {
    if (!productId) {
      setLoading(false);
      setProduct(null);
      return;
    }

    setLoading(true);
    setError(null);
    setOfflineBlocked(false);
    setFromCache(false);

    if (offline) {
      const cached = await loadCachedProductDetail(productId);
      if (cached) {
        const parsed = parseProductDetail(cached);
        setProduct(parsed);
        setFromCache(true);
        setLoading(false);
        return;
      }
      setOfflineBlocked(true);
      setProduct(null);
      setLoading(false);
      return;
    }

    try {
      const raw = await fetchProduct(productId);
      let parsed = parseProductDetail(raw);
      parsed = await loadSellerCount(parsed);
      setProduct(parsed);
      await cacheProductDetail(productId, raw);
      await trackRecentView(raw as MobileProductListItem);
      void postTelemetry({ screen: "product", event: "product_opened" });
      void loadRelated(parsed);
    } catch (err) {
      const cached = await loadCachedProductDetail(productId);
      if (cached) {
        setProduct(parseProductDetail(cached));
        setFromCache(true);
      } else {
        setProduct(null);
        setError(err instanceof Error ? err.message : "Не удалось загрузить товар");
      }
    } finally {
      setLoading(false);
    }
  }, [loadRelated, loadSellerCount, offline, productId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const onAddToCart = useCallback(async () => {
    if (!productId || !product) return;
    if (offline) {
      setCartMessage("Для добавления в корзину нужен интернет");
      return;
    }
    if (product.stock <= 0) {
      setCartMessage("Товар недоступен для заказа");
      return;
    }
    setAddingToCart(true);
    setCartMessage(null);
    setCartSuccess(false);
    try {
      await addToCart(productId, 1);
      await postTelemetry({ screen: "product", event: "add_to_cart" });
      setCartSuccess(true);
      setCartMessage("Добавлено в корзину");
      setTimeout(() => setCartSuccess(false), 1800);
    } catch (err) {
      setCartMessage(err instanceof Error ? err.message : "Не удалось добавить в корзину");
    } finally {
      setAddingToCart(false);
    }
  }, [offline, product, productId]);

  const onToggleFavorite = useCallback(async () => {
    if (!productId || favoriteBusy) return;
    if (offline) {
      setCartMessage("Для избранного нужен интернет");
      return;
    }
    setFavoriteBusy(true);
    try {
      const res = await toggleFavorite(productId);
      setIsFavorite(res.isFavorite);
    } catch {
      setCartMessage("Не удалось обновить избранное");
    } finally {
      setFavoriteBusy(false);
    }
  }, [favoriteBusy, offline, productId]);

  const onShare = useCallback(async () => {
    if (!productId) return;
    const { Share } = await import("react-native");
    const link = `lot://product/${productId}`;
    await Share.share({ message: product?.title ? `${product.title}\n${link}` : link, url: link });
    void postTelemetry({ screen: "product", event: "product_shared" });
  }, [product?.title, productId]);

  return {
    product,
    related,
    relatedFailed,
    loading,
    fromCache,
    offlineBlocked,
    error,
    isFavorite,
    favoriteBusy,
    cartMessage,
    addingToCart,
    cartSuccess,
    onAddToCart,
    onToggleFavorite,
    onShare,
    refresh: loadProduct,
  };
}
