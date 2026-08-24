import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  defaultLotPhotoFileName,
  extensionFromFileName,
  inferMimeType,
  normalizeDraftImageAsset,
  normalizeImagePickerAsset,
} from "../apps/mobile/src/seller/normalize-image-picker-asset";

const uploadSource = readFileSync("apps/mobile/src/seller/upload-seller-lot-image.ts", "utf8");
const hookSource = readFileSync("apps/mobile/src/seller/use-lot-create-form.ts", "utf8");
const uploadsRouteSource = readFileSync("app/api/mobile/seller/uploads/route.ts", "utf8");
const convertFormDataSource = readFileSync(
  "apps/mobile/node_modules/expo/src/winter/fetch/convertFormData.ts",
  "utf8",
);

describe("P0 seller photo upload — asset normalization", () => {
  it("falls back fileName when Android asset has no name", () => {
    const normalized = normalizeImagePickerAsset({
      uri: "content://media/external/images/media/42",
      width: 1080,
      height: 1080,
    });
    expect(normalized.fileName).toMatch(/^lot-photo-\d+\.jpg$/);
    expect(normalized.mimeType).toBe("image/jpeg");
  });

  it("preserves picker mime and fileName when present", () => {
    const normalized = normalizeImagePickerAsset({
      uri: "file:///cache/photo.png",
      fileName: "camera.png",
      mimeType: "image/png",
      width: 800,
      height: 600,
    });
    expect(normalized.fileName).toBe("camera.png");
    expect(normalized.mimeType).toBe("image/png");
  });

  it("normalizes draft image references for retry upload", () => {
    const normalized = normalizeDraftImageAsset({ uri: "content://tmp/1", mimeType: "image/webp" });
    expect(extensionFromFileName(normalized.fileName)).toBe(".webp");
    expect(normalized.mimeType).toBe("image/webp");
  });

  it("uses jpeg fallback filename helper", () => {
    expect(defaultLotPhotoFileName("image/png", 1)).toBe("lot-photo-1.png");
  });
});

describe("P0 seller photo upload — mobile implementation", () => {
  it("uses expo-file-system File instead of RN uri FormData part", () => {
    expect(uploadSource).toContain('from "expo-file-system"');
    expect(uploadSource).toContain("form.append(\"file\", uploadFile)");
    expect(uploadSource).not.toContain("uri: localUri");
    expect(uploadSource).not.toContain("as unknown as Blob");
  });

  it("documents expo fetch FormDataPart root cause", () => {
    expect(convertFormDataSource).toContain("Unsupported FormDataPart implementation");
    expect(convertFormDataSource).toContain("uri` is not supported");
  });

  it("uploads immediately after pick and guards publish while uploading", () => {
    expect(hookSource).toContain("processUploadQueue");
    expect(hookSource).toContain("uploadWaitPublish");
    expect(hookSource).toContain("uploadStatus");
  });

  it("uses authenticated mobile seller upload endpoint", () => {
    expect(uploadSource).toContain("/api/mobile/seller/uploads");
    expect(uploadsRouteSource).toContain("requireSellerFromRequest");
    expect(uploadsRouteSource).toContain("mimeType: contentType");
  });
});
