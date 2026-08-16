import type { RollbackAuditEntry } from "./types";

const auditLog: RollbackAuditEntry[] = [];

export function appendRollbackAudit(entry: Omit<RollbackAuditEntry, "id" | "automatic" | "timestamp">): RollbackAuditEntry {
  const record: RollbackAuditEntry = {
    ...entry,
    id: `rb-${auditLog.length + 1}-${Date.now()}`,
    automatic: false,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(record);
  return record;
}

export function listRollbackAuditLog(): RollbackAuditEntry[] {
  return [...auditLog];
}

export function resetRollbackAuditLog(): void {
  auditLog.length = 0;
}
