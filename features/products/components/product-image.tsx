"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ProductImageProps = {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Wrapper classes (aspect ratio, bg, overflow). */
  containerClassName?: string;
  /** Show «Нет фото» under the icon (hide on tiny thumbs). */
  fallbackLabel?: boolean;
};

/**
 * Product photo with object-cover and graceful fallback.
 * Broken / missing URLs switch to ProductImageFallback (no browser broken-image icon).
 */
export function ProductImage({
  src,
  alt,
  fill = true,
  width,
  height,
  sizes,
  priority,
  className,
  containerClassName,
  fallbackLabel = true,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "overflow-hidden bg-muted/50",
        !containerClassName?.includes("absolute") && "relative",
        containerClassName,
      )}
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill={fill}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", className)}
          onError={() => setFailed(true)}
        />
      ) : (
        <ProductImageFallback showLabel={fallbackLabel} />
      )}
    </div>
  );
}

type ProductImageFallbackProps = {
  className?: string;
  /** Short «Нет фото» label — omit on compact thumbnails. */
  showLabel?: boolean;
};

/** Unified neutral placeholder for missing or failed product photos. */
export function ProductImageFallback({
  className,
  showLabel = true,
}: ProductImageFallbackProps) {
  return (
    <div
      role="img"
      aria-label="Нет фото"
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted/70 dark:bg-muted/50",
        className,
      )}
    >
      <ImageIcon
        className={cn(
          "shrink-0 text-muted-foreground/55",
          showLabel ? "size-7 sm:size-8" : "size-5",
        )}
        aria-hidden
      />
      {showLabel ? (
        <span className="px-2 text-center text-[10px] font-medium tracking-wide text-muted-foreground/80 sm:text-[11px]">
          Нет фото
        </span>
      ) : null}
    </div>
  );
}
