import { NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";

import { requireAdminSession } from "@/features/auth";
import { getModerationQueueCounters, listModerationQueueItems } from "@/lib/moderation";

export async function GET(request: Request) {
  await requireAdminSession();
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && statusParam in ModerationStatus
      ? (statusParam as ModerationStatus)
      : undefined;

  const [counters, queue] = await Promise.all([
    getModerationQueueCounters(),
    listModerationQueueItems({ status, limit: 50 }),
  ]);

  return NextResponse.json({ counters, queue });
}
