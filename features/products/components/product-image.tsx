"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";

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
};

/**
 * Product photo with object-cover, aspect-friendly container, and graceful fallback.
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
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "overflow-hidden bg-surface-elevated",
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
        <ProductImageFallback />
      )}
    </div>
  );
}

export function ProductImageFallback({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/25 via-muted to-surface",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgb(255_106_0_/_16%),transparent_55%)]" />
      <ImageOff className="relative size-8 text-muted-foreground/50" />
    </div>
  );
}
