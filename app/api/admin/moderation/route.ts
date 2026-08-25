import { NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";

import { requestIdFromHeaders, withRouteTiming } from "@/lib/api/route-timing";
import { requireAdminSession } from "@/features/auth";
import { getModerationQueueCounters, listModerationQueueItems } from "@/lib/moderation";

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request);
  return withRouteTiming(
    { route: "/api/admin/moderation", method: "GET", requestId },
    async () => {
      await requireAdminSession();
      const url = new URL(request.url);
      const statusParam = url.searchParams.get("status");
      const status =
        statusParam && statusParam in ModerationStatus
          ? (statusParam as ModerationStatus)
          : undefined;
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 50);
      const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

      const counters = await getModerationQueueCounters();
      const queue = await listModerationQueueItems({ status, limit, offset });

      return NextResponse.json({ counters, queue, pagination: { limit, offset } });
    },
  );
}
