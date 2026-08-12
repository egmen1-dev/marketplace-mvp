#!/usr/bin/env tsx
/**
 * Promote existing users to ADMIN by email.
 * Does not create accounts — users must register first.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/grant-admin.ts
 *   DATABASE_URL=... npx tsx scripts/grant-admin.ts user@example.com
 */
import { UserRole } from "@prisma/client";

import {
  findUserRecordByEmail,
  normalizeAuthEmail,
} from "@/features/auth/lib/find-user-by-email";
import { prisma } from "@/lib/prisma";

/** Default operator emails (HOTFIX-UX-001.3). Override via CLI args. */
const DEFAULT_ADMIN_EMAILS = [
  "nikitapetrovskih968@gmail.com",
  "egmen1@gmail.com",
] as const;

async function main() {
  const args = process.argv.slice(2).map(normalizeAuthEmail);
  const targets = args.length > 0 ? args : [...DEFAULT_ADMIN_EMAILS];

  for (const email of targets) {
    const user = await findUserRecordByEmail(email);
    if (!user) {
      console.warn(`SKIP ${email} — user not found (register first, then re-run)`);
      continue;
    }

    if (user.email !== email) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: UserRole.ADMIN },
    });

    console.log(`OK ${email} → ADMIN`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
