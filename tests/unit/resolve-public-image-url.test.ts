import { describe, expect, it } from "vitest";

import { resolvePublicImageUrl } from "@/lib/images/resolve-public-image-url";

describe("resolvePublicImageUrl", () => {
  it("rewrites Unsplash seed URLs to local assets", () => {
    expect(
      resolvePublicImageUrl(
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
      ),
    ).toBe("/images/seed/photo-1505740420928-5e560c06d30e.jpg");
  });

  it("keeps local and blob URLs", () => {
    expect(resolvePublicImageUrl("/images/seed/photo-x.jpg")).toBe(
      "/images/seed/photo-x.jpg",
    );
    expect(
      resolvePublicImageUrl(
        "https://abc.public.blob.vercel-storage.com/products/a.jpg",
      ),
    ).toBe("https://abc.public.blob.vercel-storage.com/products/a.jpg");
  });

  it("proxies private Vercel Blob URLs through /api/media", () => {
    expect(
      resolvePublicImageUrl(
        "https://abc.private.blob.vercel-storage.com/products/a.jpg",
      ),
    ).toBe(
      "/api/media?url=https%3A%2F%2Fabc.private.blob.vercel-storage.com%2Fproducts%2Fa.jpg",
    );
  });
});
