import * as SecureStore from "expo-secure-store";

const DRAFT_KEY = "lot-draft-v1";

export type LotDraftImage = {
  uri: string;
  uploadedUrl?: string;
  uploadedPathname?: string;
};

export type LotDraft = {
  images: LotDraftImage[];
  title: string;
  description: string;
  price: string;
  city: string;
  condition: "NEW" | "REFURBISHED" | "USED";
  categoryId: string | null;
  categoryName: string | null;
  productTypeId: string | null;
  productTypeName: string | null;
  step: "photos" | "details" | "preview";
  updatedAt: string;
};

export const EMPTY_LOT_DRAFT: LotDraft = {
  images: [],
  title: "",
  description: "",
  price: "",
  city: "",
  condition: "NEW",
  categoryId: null,
  categoryName: null,
  productTypeId: null,
  productTypeName: null,
  step: "photos",
  updatedAt: new Date().toISOString(),
};

export async function loadLotDraft(): Promise<LotDraft | null> {
  try {
    const raw = await SecureStore.getItemAsync(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LotDraft;
  } catch {
    return null;
  }
}

export async function saveLotDraft(draft: LotDraft): Promise<void> {
  await SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
}

export async function clearLotDraft(): Promise<void> {
  await SecureStore.deleteItemAsync(DRAFT_KEY);
}
