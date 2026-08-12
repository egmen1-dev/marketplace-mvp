import { NextResponse } from "next/server";

import { getBuildInfo } from "@/lib/build-info";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public build marker — no secrets, no env values, no DB info. */
export async function GET() {
  return NextResponse.json(getBuildInfo());
}
