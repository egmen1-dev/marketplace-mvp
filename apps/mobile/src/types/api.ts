export type MobileErrorPayload = {
  error: {
    code: string;
    message: string;
    retryable?: boolean;
  };
};

export type MobileEnvelope<T> = T & {
  apiVersion?: string;
  schemaVersion?: string;
  syncVersion?: string;
  advisoryOnly?: boolean;
};

export type PaginationPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type BootstrapPayload = MobileEnvelope<{
  baseUrl: string;
  releaseChannel: string;
  cognitiveCapabilities: {
    brain: boolean;
    graph: boolean;
    twin: boolean;
    evolutionVisible: boolean;
    autopilot: boolean;
  };
  brainSchemaVersion: string;
  minimumSupportedBrainSchemaVersion: string;
  supportedModes: ("buyer" | "seller")[];
  forceUpgrade?: boolean;
}>;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  role: string;
};

export type NavigationItem = {
  id: string;
  label: string;
  deepLink: string;
  webPath: string;
  roles: string[];
};

export type ProductListItem = {
  id: string;
  title: string;
  price: number;
  slug: string;
  href: string;
  images?: Array<{ url: string; alt?: string | null }>;
  seller?: { storeName: string };
};
