import type { UserRole } from "@prisma/client";

export type MobileSessionRecord = {
  id: string;
  userId: string;
  deviceIdHash: string | null;
  refreshTokenHash: string;
  rotatedFromHash: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  role: UserRole;
};

export interface MobileSessionStore {
  createSession(input: {
    userId: string;
    role: UserRole;
    deviceIdHash: string | null;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Promise<MobileSessionRecord>;

  findByRefreshHash(refreshTokenHash: string): Promise<MobileSessionRecord | null>;

  rotateSession(input: {
    sessionId: string;
    newRefreshTokenHash: string;
    previousRefreshTokenHash: string;
    expiresAt: Date;
  }): Promise<MobileSessionRecord | null>;

  revokeSession(sessionId: string): Promise<boolean>;

  countActiveSessions(userId: string): Promise<number>;
}

const memorySessions = new Map<string, MobileSessionRecord>();
const memoryByHash = new Map<string, string>();

export const memoryMobileSessionStore: MobileSessionStore = {
  async createSession(input) {
    const id = `mem-${memorySessions.size + 1}-${Date.now()}`;
    const record: MobileSessionRecord = {
      id,
      userId: input.userId,
      deviceIdHash: input.deviceIdHash,
      refreshTokenHash: input.refreshTokenHash,
      rotatedFromHash: null,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      expiresAt: input.expiresAt,
      revokedAt: null,
      role: input.role,
    };
    memorySessions.set(id, record);
    memoryByHash.set(input.refreshTokenHash, id);
    return record;
  },

  async findByRefreshHash(refreshTokenHash) {
    const id = memoryByHash.get(refreshTokenHash);
    if (id) return memorySessions.get(id) ?? null;
    for (const session of memorySessions.values()) {
      if (session.rotatedFromHash === refreshTokenHash) {
        return { ...session, revokedAt: session.revokedAt ?? new Date() };
      }
    }
    return null;
  },

  async rotateSession(input) {
    const existing = memorySessions.get(input.sessionId);
    if (!existing || existing.revokedAt) return null;
    memoryByHash.delete(existing.refreshTokenHash);
    const updated: MobileSessionRecord = {
      ...existing,
      refreshTokenHash: input.newRefreshTokenHash,
      rotatedFromHash: input.previousRefreshTokenHash,
      lastUsedAt: new Date(),
      expiresAt: input.expiresAt,
    };
    memorySessions.set(input.sessionId, updated);
    memoryByHash.set(input.newRefreshTokenHash, input.sessionId);
    return updated;
  },

  async revokeSession(sessionId) {
    const existing = memorySessions.get(sessionId);
    if (!existing) return false;
    existing.revokedAt = new Date();
    memoryByHash.delete(existing.refreshTokenHash);
    return true;
  },

  async countActiveSessions(userId) {
    return [...memorySessions.values()].filter((s) => s.userId === userId && !s.revokedAt).length;
  },
};

export function resetMemoryMobileSessionStore(): void {
  memorySessions.clear();
  memoryByHash.clear();
}
