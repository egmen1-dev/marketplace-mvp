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

  it("keeps unknown Unsplash URLs when no local asset exists", () => {
    expect(
      resolvePublicImageUrl(
        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800",
      ),
    ).toBe(
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800",
    );
  });
});
