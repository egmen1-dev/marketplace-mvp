/** Compile-time Firebase QA harness flag — enabled only for instrumentation APK builds. */
export function isFirebaseQaEnabled(): boolean {
  return process.env.EXPO_PUBLIC_FIREBASE_QA === "1";
}

export function firebaseQaRunId(): string | null {
  if (!isFirebaseQaEnabled()) return null;
  return process.env.EXPO_PUBLIC_FIREBASE_QA_RUN_ID ?? null;
}
