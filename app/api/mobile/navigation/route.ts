import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/features/auth/resolve-request-user";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileNavigationManifest } from "@/lib/mobile/navigation";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const user = await resolveRequestUser(request);
  const manifest = buildMobileNavigationManifest({
    authenticated: Boolean(user),
    role: user?.role ?? null,
  });

  return NextResponse.json(withMobileApiContract(manifest, manifest.version));
}
