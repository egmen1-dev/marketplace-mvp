import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { resolveMobileDeepLink } from "@/lib/mobile/deep-links";
import { withMobileApiContract } from "@/lib/mobile/api-contract";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const uri = new URL(request.url).searchParams.get("uri");
  if (!uri) {
    return NextResponse.json({ error: "uri required" }, { status: 400 });
  }

  const destination = resolveMobileDeepLink(uri);
  if (!destination) {
    return NextResponse.json({ error: "Unsupported deep link" }, { status: 404 });
  }

  return NextResponse.json(withMobileApiContract({ uri, destination }, uri));
}
