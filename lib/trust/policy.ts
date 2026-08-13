import { prisma } from "@/lib/prisma";

export const DEFAULT_PROTECTION_DAYS = 3;

export type ProtectionPolicyDto = {
  defaultProtectionDays: number;
};

/** Active platform protection window — defaults to 3 days. */
export async function getProtectionPolicy(): Promise<ProtectionPolicyDto> {
  const row = await prisma.protectionPolicy.findFirst({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
  });

  return {
    defaultProtectionDays: row?.defaultProtectionDays ?? DEFAULT_PROTECTION_DAYS,
  };
}

export function computeProtectionEndsAt(
  from: Date,
  protectionDays: number,
): Date {
  return new Date(from.getTime() + protectionDays * 24 * 60 * 60 * 1000);
}
