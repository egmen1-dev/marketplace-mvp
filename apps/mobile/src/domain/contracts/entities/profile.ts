import type { AppMode } from "./session";

export type UserProfile = {
  readonly email: string | null;
  readonly displayName: string | null;
  readonly mode: AppMode;
  readonly sellerCapable: boolean;
};

export type FeedbackInput = {
  readonly content: string;
  readonly screen?: string;
};

export type RemoteConfig = {
  readonly flags: Readonly<Record<string, boolean>>;
  readonly experiments: Readonly<Record<string, string>>;
  readonly raw: Readonly<Record<string, unknown>>;
};

export type TabBadges = {
  readonly cart: number;
  readonly favorites: number;
  readonly orders: number;
};
