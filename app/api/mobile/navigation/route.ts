import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileNavigationManifest } from "@/lib/mobile/navigation";

export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const session = await auth();
  const manifest = buildMobileNavigationManifest({
    authenticated: Boolean(session?.user?.id),
    role: session?.user?.role ?? null,
  });

  return NextResponse.json(withMobileApiContract(manifest, manifest.version));
}
