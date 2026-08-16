import { AdminRequiredError, AuthRequiredError, requireAdminSession } from "@/features/auth";

import { isCcosEvolutionPlatformEnabled } from "./flags";
import { EvolutionPlatformDisabledError } from "./governance";

export async function requireEvolutionAdmin(): Promise<{ userId: string; email: string }> {
  const session = await requireAdminSession();
  return { userId: session.id, email: session.email ?? "admin" };
}

export function evolutionPlatformGuard(): Response | null {
  if (!isCcosEvolutionPlatformEnabled()) {
    return new Response(JSON.stringify({ error: "Evolution platform disabled", code: "EVOLUTION_DISABLED" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export { EvolutionPlatformDisabledError };
