# P0 — Mobile Seller Photo Upload Fix

**Status:** `READY_FOR_RC10.1_BUILD`  
**Recorded:** 2026-08-24  
**RC10 impact:** `BLOCKED_FOR_BETA` until RC10.1

---

## ROOT CAUSE

Expo SDK 57 installs **WinterCG `expo/fetch`** as the global `fetch` implementation (`apps/mobile/node_modules/expo/src/winter/runtime.native.ts`).

The previous mobile upload used React Native–style FormData parts:

```ts
formData.append("file", { uri, name, type } as unknown as Blob);
```

`expo/fetch` **does not support** `{ uri, name, type }` parts. Its converter explicitly throws:

```text
Unsupported FormDataPart implementation
```

(see `expo/src/winter/fetch/convertFormData.ts` — only `string`, `Blob`, or objects with `.bytes()` are supported).

EPIC 158.2/158.3 humanized the error message but did not change the upload transport, so physical Android still failed at the same point.

---

## FIX

1. **`uploadSellerLotImage(asset)`** — canonical mobile uploader using `expo-file-system` `File` (implements `.bytes()` for `expo/fetch` FormData).
2. **`normalizeImagePickerAsset`** — Android-safe `uri`, `fileName`, `mimeType` fallbacks.
3. **Upload on pick** — `processUploadQueue()` starts immediately after gallery/camera selection with per-photo status (`uploading` / `uploaded` / `failed`).
4. **Publish guard** — blocks publish while uploads are in flight; retry preserves form state.
5. **Backend response** — `POST /api/mobile/seller/uploads` now returns `{ id, url, pathname, mimeType }`.

Removed: broken `{ uri, name, type }` FormData append in `seller-lot.ts`.

---

## UPLOAD CONTRACT

```text
expo-image-picker asset
  → normalizeImagePickerAsset (uri, fileName, mimeType, width, height)
  → expo-file-system File (copy to cache with valid extension if needed)
  → FormData.append("file", File)
  → expo/fetch POST /api/mobile/seller/uploads (Bearer JWT)
  → requireSellerFromRequest
  → validateImageFile (magic bytes + extension)
  → Vercel Blob storage
  → { id, url, pathname, mimeType }
  → draft.uploadedUrl + product.images on publish
```

Web `/api/uploads` (cookie session) is **unchanged**.

---

## STAGING PROOF

```bash
npm run mobile:seller-photo-upload:smoke
```

| Check | Result |
|-------|--------|
| Real JPEG upload (seller JWT) | **PASS** (HTTP 201) |
| Returned image via `/api/media` proxy | **PASS** (HTTP 200) |
| Product persistence with image | **PASS** |

Artifact: `artifacts/mobile-seller-photo-upload/staging-smoke.json`

---

## TESTS

```bash
npm test -- tests/mobile-seller-photo-upload.test.ts
npm run mobile:seller-photo-upload:gate
```

Coverage includes:
- Asset normalization + MIME/fileName fallbacks
- No RN `{uri}` FormData in uploader
- expo-file-system `File` transport
- Upload-on-pick + publish guard
- Mobile JWT upload route contract
- Staging JPEG smoke (no mocks)

---

## PHYSICAL

**NOT_RUN** — requires RC10.1 APK on device.

Retest scope:
1. Продать → Создать ЛОТ → выбрать фото → preview → опубликовать
2. Buyer opens LOT → sees uploaded photo
3. Relaunch app → published LOT photo still visible

---

## VERDICT

`READY_FOR_RC10.1_BUILD`

Do **not** ship RC10 to sellers. Build RC10.1 (versionCode 17) after merge.
