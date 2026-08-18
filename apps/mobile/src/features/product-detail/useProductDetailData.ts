import { useCallback, useEffect, useState } from "react";

import type { ProductDetail } from "../../domain/contracts/entities/catalog";
import { categoryId, productId, sellerId } from "../../domain/contracts/value-objects/ids";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { getCommerceUseCases } from "../../domain/services/commerce-container";
import { cacheProductDetail, loadCachedProductDetail } from "../../storage/product-detail-cache";
import { trackRecentView } from "../../storage/recent-views";
import { useAppStore } from "../../store/app-store";
import {
  mergeSellerProductCountInView,
  productDetailToView,
  relatedProductsToViews,
} from "./product-view";
import { parseProductDetail, type ProductDetailView, type RelatedProduct } from "./types";

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
  onToggleFavoriteRelated: (relatedProductId: string) => Promise<void>;
  onShare: () => Promise<void>;
  refresh: () => Promise<void>;
};

function productDetailToCacheRaw(entity: ProductDetail): Record<string, unknown> {
  return {
    id: entity.id,
    title: entity.title,
    price: entity.price.amount,
    compareAt: entity.compareAt?.amount ?? null,
    stock: entity.stock,
    favoritesCount: entity.favoritesCount,
    views: 0,
    city: entity.city,
    description: entity.description,
    images: entity.gallery.map((url) => ({ url })),
    primaryImage: entity.imageUrl ? { url: entity.imageUrl } : null,
    seller: entity.sellerId
      ? { id: entity.sellerId, storeName: entity.sellerName ?? "Продавец", isVerified: false }
      : undefined,
    characteristics: entity.specs.map((row) => ({ name: row.label, displayValue: row.value })),
    pickupEnabled: false,
    pickupPoints: [],
  };
}

export function useProductDetailData(productIdParam: string | undefined): ProductDetailState {
  const commerce = getCommerceUseCases();
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

  const loadRelated = useCallback(
    async (view: ProductDetailView) => {
      try {
        const result = await commerce.loadRelatedProducts.execute({
          productId: productId(view.id),
          categoryId: view.categoryId ? categoryId(view.categoryId) : undefined,
        });
        if (!result.ok) throw new Error(domainErrorMessage(result.error));
        setRelated(relatedProductsToViews(result.value));
        setRelatedFailed(false);
      } catch {
        setRelated([]);
        setRelatedFailed(true);
      }
    },
    [commerce.loadRelatedProducts],
  );

  const loadSellerCount = useCallback(
    async (view: ProductDetailView) => {
      if (!view.seller?.id) return view;
      try {
        const result = await commerce.loadSellerCatalogCount.execute({ sellerId: sellerId(view.seller.id) });
        if (!result.ok) return view;
        const count = result.value;
        return mergeSellerProductCountInView(view, count > 0 ? count : null);
      } catch {
        return view;
      }
    },
    [commerce.loadSellerCatalogCount],
  );

  const loadProduct = useCallback(async () => {
    if (!productIdParam) {
      setLoading(false);
      setProduct(null);
      return;
    }

    setLoading(true);
    setError(null);
    setOfflineBlocked(false);
    setFromCache(false);

    if (offline) {
      const cached = await loadCachedProductDetail(productIdParam);
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
      const result = await commerce.loadProductDetail.execute({ productId: productId(productIdParam) });
      if (!result.ok) throw new Error(domainErrorMessage(result.error));

      const entity = result.value;
      let view = productDetailToView(entity);
      view = await loadSellerCount(view);
      setProduct(view);
      setIsFavorite(entity.isFavorite);

      const cacheRaw = productDetailToCacheRaw(entity);
      await cacheProductDetail(productIdParam, cacheRaw);
      await trackRecentView({
        id: entity.id,
        title: entity.title,
        price: entity.price.amount,
        compareAt: entity.compareAt?.amount ?? null,
        primaryImage: entity.imageUrl ? { url: entity.imageUrl } : null,
        seller: entity.sellerName ? { storeName: entity.sellerName } : undefined,
        stock: entity.stock,
        favoritesCount: entity.favoritesCount,
      });
      commerce.trackScreenEvent({ screen: "product", event: "product_opened" });
      void loadRelated(view);
    } catch (err) {
      const cached = await loadCachedProductDetail(productIdParam);
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
  }, [commerce.loadProductDetail, commerce.trackScreenEvent, loadRelated, loadSellerCount, offline, productIdParam]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const onAddToCart = useCallback(async () => {
    if (!productIdParam || !product) return;
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
      const result = await commerce.addToCart.execute({ productId: productId(productIdParam), quantity: 1 });
      if (!result.ok) throw new Error(domainErrorMessage(result.error));
      commerce.trackScreenEvent({ screen: "product", event: "add_to_cart" });
      setCartSuccess(true);
      setCartMessage("Добавлено в корзину");
      setTimeout(() => setCartSuccess(false), 1800);
    } catch (err) {
      setCartMessage(err instanceof Error ? err.message : "Не удалось добавить в корзину");
    } finally {
      setAddingToCart(false);
    }
  }, [commerce.addToCart, commerce.trackScreenEvent, offline, product, productIdParam]);

  const onToggleFavorite = useCallback(async () => {
    if (!productIdParam || favoriteBusy) return;
    if (offline) {
      setCartMessage("Для избранного нужен интернет");
      return;
    }
    setFavoriteBusy(true);
    try {
      const result = await commerce.toggleFavorite.execute({ productId: productId(productIdParam) });
      if (!result.ok) throw new Error(domainErrorMessage(result.error));
      setIsFavorite(result.value.isFavorite);
    } catch {
      setCartMessage("Не удалось обновить избранное");
    } finally {
      setFavoriteBusy(false);
    }
  }, [commerce.toggleFavorite, favoriteBusy, offline, productIdParam]);

  const onToggleFavoriteRelated = useCallback(
    async (relatedProductId: string) => {
      if (offline) return;
      const result = await commerce.toggleFavorite.execute({ productId: productId(relatedProductId) });
      if (!result.ok) {
        setCartMessage(domainErrorMessage(result.error));
      }
    },
    [commerce.toggleFavorite, offline],
  );

  const onShare = useCallback(async () => {
    if (!productIdParam) return;
    const { Share } = await import("react-native");
    const link = `lot://product/${productIdParam}`;
    await Share.share({ message: product?.title ? `${product.title}\n${link}` : link, url: link });
    commerce.trackScreenEvent({ screen: "product", event: "product_shared" });
  }, [commerce.trackScreenEvent, product?.title, productIdParam]);

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
    onToggleFavoriteRelated,
    onShare,
    refresh: loadProduct,
  };
}
