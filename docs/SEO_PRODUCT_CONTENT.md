# Product content & SEO (TASK 058, sections 19–22, 47)

## No seller-facing SEO duplication (section 19/47)

The seller product form no longer has «SEO название / SEO описание». Sellers fill
only:

- **Название товара** (title)
- **Описание товара** (description)
- **Характеристики** (type-driven)

The `Product.seoTitle` / `Product.seoDescription` columns remain but are
`@deprecated` and no longer written from the form (`createProduct`/`updateProduct`
stop persisting them). Existing products are unaffected.

## Auto SEO metadata (section 20)

`ProductSearchDocumentBuilder` (`lib/search/search-document.ts`) derives metadata:

- **metaTitle** = title (+ product type if missing) + « — купить на LOT», ≤120 chars.
- **metaDescription** = description, else synthesized from type + top characteristics
  + breadcrumb, ≤300 chars.

PDP `generateMetadata` (`app/product/[id]/page.tsx`) uses this — title is the main
relevance field and metadata base; description is customer-facing content and a
relevance field; characteristics and taxonomy enrich search context automatically.
No keyword stuffing.

## Content quality score (section 22)

`ProductContentQualityScore` (`lib/search/content-quality.ts`) returns 0–100 plus
actionable hints from: title/description length, category, product type, required &
optional characteristics filled, main image, image count, price, stock. It feeds the
ranking content signal and can drive a seller «Карточка заполнена на N%» indicator.
