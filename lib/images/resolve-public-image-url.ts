/**
 * Rewrites legacy Unsplash seed URLs to local `/images/seed/*` assets so
 * production UI does not depend on images.unsplash.com (LCP / reliability).
 * Only IDs we ship under public/images/seed are rewritten; unknown Unsplash
 * URLs pass through (Next Image remotePatterns still allow them).
 */

const UNSPLASH_PHOTO_RE =
  /(?:https?:)?\/\/images\.unsplash\.com\/(photo-[a-zA-Z0-9_-]+)/i;

/** Photo IDs present in public/images/seed/*.jpg */
const LOCAL_SEED_PHOTO_IDS = new Set([
  "photo-1441984904996-e0b2414e6631",
  "photo-1484704849700-f032a568e944",
  "photo-1486262715619-67b85e0b08d3",
  "photo-1492144534655-ae79c964c9d7",
  "photo-1498049794561-7780e7231661",
  "photo-1504148455328-c376907d081c",
  "photo-1505740420928-5e560c06d30e",
  "photo-1507473885765-e6ed057f782c",
  "photo-1511919884226-fd3cad546d65",
  "photo-1517836357463-d25dfeac3438",
  "photo-1523275335684-37898b6baf30",
  "photo-1530124566582-a618bc2615dc",
  "photo-1541643600914-78b084683601",
  "photo-1542291026-7eec264c27ff",
  "photo-1544022613-e87ca75a784a",
  "photo-1553062407-98eeb64c6a62",
  "photo-1556228578-0d85b1a4d571",
  "photo-1572981779307-38b8cabb2407",
  "photo-1578500494198-246f612d3b3d",
  "photo-1596462502278-27bfdc403348",
  "photo-1601925260368-ae2f83cf8b7f",
  "photo-1616486338812-3dadae4b4ace",
]);

export function resolvePublicImageUrl(
  url: string | null | undefined,
): string | null {
  if (url == null) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/images/")) {
    return trimmed;
  }

  const match = trimmed.match(UNSPLASH_PHOTO_RE);
  if (match?.[1] && LOCAL_SEED_PHOTO_IDS.has(match[1])) {
    return `/images/seed/${match[1]}.jpg`;
  }

  return trimmed;
}
