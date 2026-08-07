"use client";

import { useState } from "react";

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
  const current = images[active] ?? null;

  if (!current) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted/50 ring-1 ring-border sm:aspect-[4/5] lg:aspect-square">
        <ProductImageFallback showLabel />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl bg-surface-elevated ring-1 ring-border">
        <ProductImage
          src={current.url}
          alt={current.alt ?? title}
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          containerClassName="aspect-square sm:aspect-[4/5] lg:aspect-square"
          className="transition-opacity duration-[var(--duration-base)]"
        />
      </div>

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
  );
}
