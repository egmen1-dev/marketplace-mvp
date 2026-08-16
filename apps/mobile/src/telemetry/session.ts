let sessionId = `lot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function getSessionId(): string {
  return sessionId;
}

export function resetSessionId(): void {
  sessionId = `lot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
