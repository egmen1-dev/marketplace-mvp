import { NextResponse } from "next/server";

import { AdminRequiredError, AuthRequiredError } from "@/features/auth";

export function handleEvolutionAdminError(err: unknown): NextResponse {
  if (err instanceof AuthRequiredError) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized", retryable: false } }, { status: 401 });
  }
  if (err instanceof AdminRequiredError) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden", retryable: false } }, { status: 403 });
  }
  if (err instanceof Error && err.message.includes("disabled")) {
    return NextResponse.json({ error: { code: "EVOLUTION_DISABLED", message: err.message, retryable: false } }, { status: 503 });
  }
  return NextResponse.json(
    { error: { code: "EVOLUTION_ERROR", message: err instanceof Error ? err.message : "Unknown error", retryable: false } },
    { status: 400 },
  );
}
