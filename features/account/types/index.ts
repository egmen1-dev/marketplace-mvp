/** Buyer profile DTO — `avatarUrl` maps to User.image. */
export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type ProfileUpdateResult =
  | { ok: true; profile: UserProfile }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };
