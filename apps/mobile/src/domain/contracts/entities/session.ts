export type AppMode = "buyer" | "seller";

export type UserRole = "BUYER" | "SELLER" | "ADMIN" | null;

export type Session = {
  readonly userId: string;
  readonly email: string | null;
  readonly role: UserRole;
  readonly sellerCapable: boolean;
  readonly sessionId: string;
  readonly expiresAt: string | null;
};

export type LoginCredentials = {
  readonly email: string;
  readonly password: string;
  readonly pendingDeepLink?: string;
};

export type AccessToken = {
  readonly token: string;
  readonly expiresAt: string | null;
};
