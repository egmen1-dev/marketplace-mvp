import type { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { MobileSessionRecord, MobileSessionStore } from "./session-store";

function toRecord(row: {
  id: string;
  userId: string;
  deviceIdHash: string | null;
  refreshTokenHash: string;
  rotatedFromHash: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  user: { role: UserRole };
}): MobileSessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    deviceIdHash: row.deviceIdHash,
    refreshTokenHash: row.refreshTokenHash,
    rotatedFromHash: row.rotatedFromHash,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    role: row.user.role,
  };
}

export const prismaMobileSessionStore: MobileSessionStore = {
  async createSession(input) {
    const row = await prisma.mobileAuthSession.create({
      data: {
        userId: input.userId,
        deviceIdHash: input.deviceIdHash,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
      },
      include: { user: { select: { role: true } } },
    });
    return toRecord(row);
  },

  async findByRefreshHash(refreshTokenHash) {
    const row = await prisma.mobileAuthSession.findUnique({
      where: { refreshTokenHash },
      include: { user: { select: { role: true } } },
    });
    if (row) return toRecord(row);

    const replay = await prisma.mobileAuthSession.findFirst({
      where: { rotatedFromHash: refreshTokenHash },
      include: { user: { select: { role: true } } },
    });
    if (replay) {
      return {
        ...toRecord(replay),
        revokedAt: replay.revokedAt ?? new Date(),
        refreshTokenHash,
      };
    }
    return null;
  },

  async rotateSession(input) {
    try {
      const row = await prisma.mobileAuthSession.update({
        where: { id: input.sessionId, revokedAt: null },
        data: {
          refreshTokenHash: input.newRefreshTokenHash,
          rotatedFromHash: input.previousRefreshTokenHash,
          lastUsedAt: new Date(),
          expiresAt: input.expiresAt,
        },
        include: { user: { select: { role: true } } },
      });
      return toRecord(row);
    } catch {
      return null;
    }
  },

  async revokeSession(sessionId) {
    try {
      await prisma.mobileAuthSession.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  },

  async countActiveSessions(userId) {
    return prisma.mobileAuthSession.count({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  },
};
