/**
 * Wildberries Content API taxonomy provider.
 * Endpoints (official):
 * - GET /content/v2/object/parent/all
 * - GET /content/v2/object/all
 * - GET /content/v2/object/charcs/{subjectId}
 *
 * Requires WB_API_TOKEN (or WB_CONTENT_API_TOKEN).
 * Falls back should be handled by the caller via LocalSnapshotProvider.
 */

import { inferCharacteristicTypeFromName, mapWbCharcType, slugifyRu } from "../normalize";
import type {
  NormalizedCategory,
  NormalizedCharacteristic,
  NormalizedProductType,
  NormalizedTaxonomy,
  TaxonomyProvider,
} from "../types";

const DEFAULT_BASE = "https://content-api.wildberries.ru";

type WbParent = {
  id?: number;
  name?: string;
  isVisible?: boolean;
};

type WbSubject = {
  subjectID?: number;
  subjectId?: number;
  parentID?: number;
  parentId?: number;
  subjectName?: string;
  parentName?: string;
};

type WbCharc = {
  charcID?: number;
  charcId?: number;
  name?: string;
  required?: boolean;
  isRequiredForCreate?: boolean;
  unitName?: string;
  charcType?: number;
  hasFilter?: boolean;
  maxCount?: number;
};

async function wbGet<T>(
  path: string,
  token: string,
  baseUrl: string,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(path, baseUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`WB API ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export type WbProviderOptions = {
  token: string;
  baseUrl?: string;
  /** Limit subjects fetched (pagination). Default 500 for safe syncs. */
  subjectLimit?: number;
  /** Max subjects to fetch charcs for (rate limits). Default 80. */
  charcLimit?: number;
  locale?: string;
};

export class WbTaxonomyProvider implements TaxonomyProvider {
  readonly name = "wildberries" as const;
  private opts: Required<Pick<WbProviderOptions, "token" | "baseUrl" | "subjectLimit" | "charcLimit" | "locale">>;

  constructor(opts: WbProviderOptions) {
    this.opts = {
      token: opts.token,
      baseUrl: opts.baseUrl ?? process.env.WB_CONTENT_API_URL ?? DEFAULT_BASE,
      subjectLimit: opts.subjectLimit ?? 500,
      charcLimit: opts.charcLimit ?? 80,
      locale: opts.locale ?? "ru",
    };
  }

  async fetchTaxonomy(): Promise<NormalizedTaxonomy> {
    const { token, baseUrl, locale, subjectLimit, charcLimit } = this.opts;

    const parentsRes = await wbGet<{ data?: WbParent[] } | WbParent[]>(
      "/content/v2/object/parent/all",
      token,
      baseUrl,
      { locale },
    );
    const parents = Array.isArray(parentsRes)
      ? parentsRes
      : (parentsRes.data ?? []);

    const categories: NormalizedCategory[] = [];
    const parentKeyByExternal = new Map<string, string>();

    for (const [i, p] of parents.entries()) {
      const id = p.id;
      if (id == null || !p.name) continue;
      const externalId = String(id);
      const slug = `wb-parent-${slugifyRu(p.name) || externalId}`;
      const key = `parent:${externalId}`;
      parentKeyByExternal.set(externalId, key);
      categories.push({
        key,
        name: p.name,
        slug,
        parentKey: null,
        level: 1,
        path: slug,
        sortOrder: i,
        externalSource: "wildberries",
        externalId,
        externalName: p.name,
      });
    }

    // Paginate subjects
    const subjects: WbSubject[] = [];
    let offset = 0;
    const pageSize = 1000;
    while (subjects.length < subjectLimit) {
      const page = await wbGet<{ data?: WbSubject[] } | WbSubject[]>(
        "/content/v2/object/all",
        token,
        baseUrl,
        { locale, limit: Math.min(pageSize, subjectLimit - subjects.length), offset },
      );
      const rows = Array.isArray(page) ? page : (page.data ?? []);
      if (!rows.length) break;
      subjects.push(...rows);
      offset += rows.length;
      if (rows.length < pageSize) break;
    }

    // Intermediate category per unique parentName under parent
    const midKeyByParent = new Map<string, string>();
    const productTypes: NormalizedProductType[] = [];

    for (const [i, s] of subjects.entries()) {
      const subjectId = s.subjectID ?? s.subjectId;
      const parentId = s.parentID ?? s.parentId;
      if (subjectId == null || !s.subjectName) continue;
      const parentExt = parentId != null ? String(parentId) : null;
      const parentKey = parentExt ? parentKeyByExternal.get(parentExt) ?? null : null;

      let categoryKey = parentKey;
      if (parentKey && s.parentName) {
        const midExternal = `${parentExt}:${slugifyRu(s.parentName)}`;
        if (!midKeyByParent.has(midExternal)) {
          const midSlug = `wb-mid-${slugifyRu(s.parentName)}-${parentExt}`;
          const midKey = `mid:${midExternal}`;
          midKeyByParent.set(midExternal, midKey);
          const parentCat = categories.find((c) => c.key === parentKey);
          categories.push({
            key: midKey,
            name: s.parentName,
            slug: midSlug,
            parentKey,
            level: 2,
            path: parentCat ? `${parentCat.path}/${midSlug}` : midSlug,
            sortOrder: midKeyByParent.size,
            externalSource: "wildberries",
            externalId: midExternal,
            externalName: s.parentName,
          });
        }
        categoryKey = midKeyByParent.get(midExternal)!;
      }

      if (!categoryKey) continue;

      const externalId = String(subjectId);
      const slug = `wb-pt-${slugifyRu(s.subjectName)}-${externalId}`;
      const characteristics: NormalizedCharacteristic[] = [];

      if (i < charcLimit) {
        try {
          const charcRes = await wbGet<{ data?: WbCharc[] } | WbCharc[]>(
            `/content/v2/object/charcs/${subjectId}`,
            token,
            baseUrl,
            { locale },
          );
          const charcs = Array.isArray(charcRes) ? charcRes : (charcRes.data ?? []);
          for (const [ci, ch] of charcs.entries()) {
            const cid = ch.charcID ?? ch.charcId;
            if (cid == null || !ch.name) continue;
            const type = inferCharacteristicTypeFromName(
              ch.name,
              mapWbCharcType(ch.charcType),
            );
            const finalType =
              ch.maxCount && ch.maxCount > 1 && type === "SELECT"
                ? "MULTISELECT"
                : type;
            characteristics.push({
              key: `charc:${cid}`,
              name: ch.name,
              slug: slugifyRu(ch.name) || `charc-${cid}`,
              type: finalType,
              required: Boolean(ch.isRequiredForCreate ?? ch.required),
              unit: ch.unitName ?? null,
              options: null,
              sortOrder: ci,
              filterable: Boolean(ch.hasFilter),
              externalId: String(cid),
              externalSource: "wildberries",
            });
          }
          // Gentle rate limit
          await new Promise((r) => setTimeout(r, 50));
        } catch {
          // Keep subject without characteristics rather than fail entire sync
        }
      }

      productTypes.push({
        key: `subject:${externalId}`,
        name: s.subjectName,
        slug,
        categoryKey,
        sortOrder: i,
        externalSource: "wildberries",
        externalId,
        externalName: s.subjectName,
        characteristics,
      });
    }

    return {
      source: "wildberries",
      fetchedAt: new Date().toISOString(),
      categories,
      productTypes,
    };
  }
}

export function createWbProviderFromEnv(): WbTaxonomyProvider | null {
  const token =
    process.env.WB_API_TOKEN?.trim() ||
    process.env.WB_CONTENT_API_TOKEN?.trim() ||
    "";
  if (!token) return null;
  return new WbTaxonomyProvider({ token });
}
