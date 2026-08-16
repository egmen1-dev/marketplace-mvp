import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      supported: false,
      reason: "Mobile logout API reserved — web session logout remains primary path",
    },
    { status: 501 },
  );
}
