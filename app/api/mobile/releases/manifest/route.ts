import { NextResponse } from "next/server";

import { buildReleaseManifestFromRegistry } from "@/lib/mobile-release-platform/manifest-sync";

export async function GET() {
  const manifest = await buildReleaseManifestFromRegistry();
  return NextResponse.json(manifest);
}
