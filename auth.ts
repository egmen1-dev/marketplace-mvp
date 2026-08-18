import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@prisma/client";

import { authConfig } from "@/auth.config";
import { findUserByEmailForAuth } from "@/features/auth/lib/find-user-by-email";
import { verifyPassword } from "@/features/auth/lib/password";
import { signInSchema } from "@/features/auth/schemas";
import { prisma } from "@/lib/prisma";

/** Refresh role / sellerProfileId from DB at most every 5 minutes. */
const ROLE_REFRESH_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await findUserByEmailForAuth(parsed.data.email);

        if (!user?.passwordHash) return null;
        if (user.isBlocked) return null;

        const valid = await verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          sellerProfileId: user.sellerProfile?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.sellerProfileId = user.sellerProfileId;
        token.roleCheckedAt = Date.now();
        return token;
      }

      const userId = token.id as string | undefined;
      if (!userId) return token;

      const lastCheck = (token.roleCheckedAt as number | undefined) ?? 0;
      const forceRefresh = trigger === "update";
      if (!forceRefresh && Date.now() - lastCheck < ROLE_REFRESH_MS) {
        return token;
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            role: true,
            isBlocked: true,
            sellerProfile: { select: { id: true } },
          },
        });
        if (dbUser?.isBlocked) {
          return null;
        }
        if (dbUser) {
          token.role = dbUser.role as UserRole;
          token.sellerProfileId = dbUser.sellerProfile?.id ?? null;
        }
        token.roleCheckedAt = Date.now();
      } catch {
        // Keep existing token claims if DB is briefly unavailable.
        token.roleCheckedAt = Date.now();
      }

      return token;
    },
  },
});
