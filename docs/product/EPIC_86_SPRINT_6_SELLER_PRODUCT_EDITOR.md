# EPIC 86 Sprint 6 — Seller Product Editor

## Mission

Professional seller product editor for commercial editing (not raw CRUD).

## Features

| Feature | Implementation |
|---------|----------------|
| Gallery | `ProductEditorGallery` + `/api/uploads` multipart |
| Title, description, price, stock, SKU | Form fields with validation |
| Category / attributes | Categories API + taxonomy browse |
| Status / visibility | Draft / published / hidden mapping |
| Draft save | Manual + autosave (debounced) |
| Publish | Action Center `publish_product` |
| Preview | Native `/product/[id]` when ACTIVE only |
| Moderation feedback | Real `ProductModeration` issues from backend |
| Autosave | Debounced draft PATCH/POST |
| Offline draft | Local snapshot via `readSnapshot` / `saveSnapshot` |
| Undo | Restore last saved server snapshot |
| Discount editing | **NOT_SUPPORTED** (`compareAt` read-only) |

## API

- `GET /api/mobile/seller/products/[id]?editor=1`
- `POST /api/mobile/seller/products`
- `PATCH /api/mobile/seller/products/[id]`
- `GET /api/mobile/seller/categories`
- `GET /api/mobile/seller/taxonomy/browse`

## Routes

- `/seller/product/new`
- `/seller/product/[id]/edit`

## Gate

```bash
npm run mobile:sprint-100:seller-product-editor
```

Artifacts: `artifacts/seller-product-editor/`
