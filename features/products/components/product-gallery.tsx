"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";

import {
  ProductImage,
  ProductImageFallback,
} from "@/features/products/components/product-image";
import type { ProductImageDto } from "@/features/products/types";
import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  images: ProductImageDto[];
  title: string;
};

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const labelId = useId();
  const current = images[active] ?? null;

  useEffect(() => {
    if (!zoomed) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setZoomed(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoomed]);

  if (!current) {
    return (
      <div
        className="relative aspect-square overflow-hidden rounded-2xl bg-muted/50 ring-1 ring-border sm:aspect-[4/5] lg:aspect-square"
        data-testid="pdp-gallery-empty"
      >
        <ProductImageFallback showLabel />
      </div>
    );
  }

  return (
    <>
      <div
        className="flex flex-col gap-3 lg:flex-row-reverse"
        data-testid="pdp-gallery"
      >
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="relative min-w-0 flex-1 overflow-hidden rounded-2xl bg-surface-elevated ring-1 ring-border transition-[box-shadow] hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          aria-label="Увеличить фото"
        >
          <ProductImage
            src={current.url}
            alt={current.alt ?? title}
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            containerClassName="aspect-square sm:aspect-[4/5] lg:aspect-square"
            className="transition-opacity duration-[var(--duration-base)]"
          />
        </button>

        {images.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 lg:w-20 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
            {images.map((img, index) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-xl ring-1 transition-[box-shadow,ring-color] duration-[var(--duration-fast)] lg:size-20 lg:w-full",
                  index === active
                    ? "ring-2 ring-primary shadow-glow"
                    : "ring-border hover:ring-primary/40",
                )}
                aria-label={`Фото ${index + 1}`}
                aria-pressed={index === active}
              >
                <ProductImage
                  src={img.url}
                  alt={img.alt ?? `${title} ${index + 1}`}
                  sizes="80px"
                  containerClassName="absolute inset-0"
                  fallbackLabel={false}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {zoomed ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
          data-testid="pdp-gallery-zoom"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p id={labelId} className="truncate text-sm font-medium">
              {title}
            </p>
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className="inline-flex size-10 items-center justify-center rounded-xl ring-1 ring-border transition-colors hover:bg-surface"
              aria-label="Закрыть"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
            <ProductImage
              src={current.url}
              alt={current.alt ?? title}
              sizes="100vw"
              containerClassName="relative h-full max-h-[calc(100vh-5rem)] w-full max-w-5xl"
              className="object-contain"
            />
          </div>
          {images.length > 1 ? (
            <div className="flex justify-center gap-2 border-t border-border px-4 py-3">
              {images.map((img, index) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActive(index)}
                  className={cn(
                    "relative size-14 overflow-hidden rounded-lg ring-1",
                    index === active ? "ring-2 ring-primary" : "ring-border",
                  )}
                  aria-label={`Фото ${index + 1}`}
                >
                  <ProductImage
                    src={img.url}
                    alt={img.alt ?? `${title} ${index + 1}`}
                    sizes="56px"
                    containerClassName="absolute inset-0"
                    fallbackLabel={false}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
