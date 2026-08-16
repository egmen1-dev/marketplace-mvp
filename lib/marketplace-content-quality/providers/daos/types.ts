export type DaosCriticRequest = {
  productId: string;
  name: string;
  description?: string | null;
  categoryName?: string | null;
  images: Array<{ url: string; isPrimary: boolean; alt?: string | null }>;
  characteristics: Array<{ name: string; value: string }>;
  hasVideo: boolean;
};

export type DaosCriticFactor = {
  score: number;
  confidence: number;
  reasons: string[];
};

export type DaosCriticResponse = {
  ok: boolean;
  modelVersion?: string;
  providerVersion?: string;
  factors?: {
    photoQuality?: DaosCriticFactor;
    thumbnail?: DaosCriticFactor;
    commercialVisibility?: DaosCriticFactor;
    composition?: DaosCriticFactor;
    background?: DaosCriticFactor;
    lighting?: DaosCriticFactor;
    readability?: DaosCriticFactor;
    photoRelevance?: DaosCriticFactor;
    productIdentity?: DaosCriticFactor;
  };
  error?: string;
};

export type DaosClientConfig = {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
};
