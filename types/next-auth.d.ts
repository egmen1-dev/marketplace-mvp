import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      sellerProfileId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    sellerProfileId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    sellerProfileId: string | null;
  }
}
