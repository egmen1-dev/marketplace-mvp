import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      supported: false,
      reason: "Mobile refresh tokens not enabled — use web session until MOBILE_AUTH_ARCHITECTURE Phase 2",
    },
    { status: 501 },
  );
}
