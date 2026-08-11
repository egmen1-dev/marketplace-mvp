/**
 * ProductSearchDocumentBuilder (TASK 058, section 21).
 *
 * Aggregates a product's searchable text from title, description, product type,
 * category breadcrumb, characteristics, brand, aliases and (lightly) the store
 * name. Sellers never edit this document directly — it is derived. The output
 * powers relevance/search and auto-generated SEO metadata (section 20).
 */

import { normalizeAlias } from "@/lib/catalog-taxonomy";

export type SearchDocumentInput = {
  title: string;
  description?: string | null;
  productTypeName?: string | null;
  categoryBreadcrumb?: string[];
  characteristics?: Array<{
    name: string;
    value: string;
    unit?: string | null;
  }>;
  brand?: string | null;
  aliases?: string[];
  storeName?: string | null;
  city?: string | null;
};

export type SearchDocument = {
  /** Weighted searchable text (title/type repeated for relevance weight). */
  text: string;
  /** Distinct normalized keywords for keyword matching / suggestions. */
  keywords: string[];
  /** Auto SEO title (no seller-authored duplicate). */
  metaTitle: string;
  /** Auto SEO description (no seller-authored duplicate). */
  metaDescription: string;
};

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function keywordsFrom(parts: string[]): string[] {
  const set = new Set<string>();
  for (const p of parts) {
    for (const tok of normalizeAlias(p).split(" ")) {
      if (tok.length >= 3) set.add(tok);
    }
  }
  return [...set];
}

/** Build the derived search document for a product. */
export function buildSearchDocument(input: SearchDocumentInput): SearchDocument {
  const title = clean(input.title);
  const type = clean(input.productTypeName);
  const crumbs = (input.categoryBreadcrumb ?? []).map(clean).filter(Boolean);
  const chars = (input.characteristics ?? [])
    .map((c) => `${clean(c.name)} ${clean(c.value)}${c.unit ? ` ${clean(c.unit)}` : ""}`.trim())
    .filter(Boolean);
  const aliases = (input.aliases ?? []).map(clean).filter(Boolean);
  const brand = clean(input.brand);
  const description = clean(input.description);
  const store = clean(input.storeName);

  // Title and product type get extra weight by repetition in the relevance text.
  const textParts = [
    title,
    title,
    type,
    type,
    brand,
    ...crumbs,
    ...aliases,
    ...chars,
    description,
    store, // lowest weight, once
  ].filter(Boolean);

  const keywords = keywordsFrom([
    title,
    type,
    brand,
    ...crumbs,
    ...aliases,
    ...chars.map((c) => c),
  ]);

  const metaTitle = buildMetaTitle({ title, type, brand });
  const metaDescription = buildMetaDescription({
    title,
    type,
    crumbs,
    description,
    chars,
  });

  return {
    text: textParts.join(" \u2022 "),
    keywords,
    metaTitle,
    metaDescription,
  };
}

function buildMetaTitle(p: { title: string; type: string; brand: string }): string {
  const base = p.title || p.type || "Товар";
  // Avoid duplicating the type if the title already contains it.
  const withType =
    p.type && !normalizeAlias(base).includes(normalizeAlias(p.type))
      ? `${base} — ${p.type}`
      : base;
  const full = `${withType} — купить на LOT`;
  return full.slice(0, 120);
}

function buildMetaDescription(p: {
  title: string;
  type: string;
  crumbs: string[];
  description: string;
  chars: string[];
}): string {
  if (p.description) {
    return p.description.slice(0, 300);
  }
  const specs = p.chars.slice(0, 3).join(", ");
  const where = p.crumbs.length ? ` в категории «${p.crumbs[p.crumbs.length - 1]}»` : "";
  const parts = [
    `${p.title || p.type}${where}.`,
    specs ? `Характеристики: ${specs}.` : "",
    "Купить с доставкой или самовывозом на маркетплейсе LOT.",
  ].filter(Boolean);
  return parts.join(" ").slice(0, 300);
}
