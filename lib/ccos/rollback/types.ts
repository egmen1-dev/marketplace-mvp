/** CCOS rollback foundation — evolution gate (no automatic rollback) */

export type RollbackArtifactType = "graph_version" | "brain_version" | "knowledge_version";

export type VerifiedVersionStatus = "ACCEPTED" | "DEPRECATED";

export type VersionProvenance = {
  source: string;
  module: string;
  contractVersion: string;
  acceptedBy: string;
};

export type VerifiedVersionRecord = {
  version: string;
  artifactType: RollbackArtifactType;
  provenance: VersionProvenance;
  acceptedAt: string;
  status: VerifiedVersionStatus;
};

export type RollbackAuditEntry = {
  id: string;
  artifactType: RollbackArtifactType;
  fromVersion: string;
  toVersion: string;
  reason: string;
  requestedBy: string;
  approvedBy: string;
  timestamp: string;
  automatic: false;
};

export type RollbackRequestInput = {
  artifactType: RollbackArtifactType;
  fromVersion: string;
  toVersion: string;
  reason: string;
  requestedBy: string;
  approvedBy: string;
};

export type VersionPointerBundle = {
  graph: { current: string; previous: string | null };
  brain: { current: string; previous: string | null };
  knowledge: { current: string; previous: string | null };
};
