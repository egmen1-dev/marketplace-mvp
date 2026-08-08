import type { MetadataRoute } from "next";

import { getCanonicalAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const origin = getCanonicalAppUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/seller/dashboard",
          "/seller/products",
          "/seller/orders",
          "/seller/settings",
          "/seller/analytics",
          "/checkout",
          "/cart",
          "/account",
          "/account/",
          "/profile",
          "/favorites",
          "/history",
          "/orders",
          "/settings",
          "/auth/",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
