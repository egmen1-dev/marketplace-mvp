import { NextResponse } from "next/server";

import { requireAdminSession, AuthRequiredError, AdminRequiredError } from "@/features/auth";
import {
  createReleaseDraft,
  getReleaseDashboardRows,
  publishRelease,
  rollbackRelease,
  setRolloutPercent,
} from "@/lib/mobile-release-platform/release-manager";
import { assignTesterToRelease, upsertTester } from "@/lib/mobile-release-platform/distribution";
import { getPlatformAnalyticsOverview } from "@/lib/mobile-release-platform/analytics";
import { channelLabel } from "@/lib/mobile-release-platform/channels";

export async function GET() {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err instanceof AdminRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw err;
  }

  const [rows, analytics] = await Promise.all([getReleaseDashboardRows(), getPlatformAnalyticsOverview()]);

  return NextResponse.json({
    releases: rows.map((r) => ({
      id: r.id,
      versionName: r.versionName,
      versionCode: r.versionCode,
      gitCommit: r.gitCommit.slice(0, 7),
      sha256: r.sha256,
      channel: r.channel,
      channelLabel: channelLabel(r.channel),
      status: r.status,
      rolloutPercent: r.rolloutPercent,
      mandatory: r.mandatory,
      downloadUrl: r.downloadUrl,
      artifactSizeBytes: r.artifactSizeBytes,
      publishedAt: r.publishedAt,
      eventCount: r._count.analyticsEvents,
      testerCount: r._count.testerAssignments,
    })),
    analytics,
  });
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err instanceof AdminRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw err;
  }

  const body = (await request.json()) as {
    action: string;
    releaseId?: string;
    percent?: number;
    testerEmail?: string;
    testerName?: string;
    input?: Record<string, unknown>;
  };

  switch (body.action) {
    case "create": {
      const input = body.input ?? {};
      const release = await createReleaseDraft({
        versionName: String(input.versionName ?? "0.0.0"),
        versionCode: Number(input.versionCode ?? 1),
        gitCommit: String(input.gitCommit ?? "unknown"),
        sha256: String(input.sha256 ?? ""),
        releaseNotes: String(input.releaseNotes ?? ""),
        downloadUrl: input.downloadUrl ? String(input.downloadUrl) : null,
        channel: (input.channel as "CLOSED_ALPHA") ?? "CLOSED_ALPHA",
      });
      return NextResponse.json({ release });
    }
    case "publish": {
      if (!body.releaseId) return NextResponse.json({ error: "releaseId required" }, { status: 400 });
      return NextResponse.json({ release: await publishRelease(body.releaseId) });
    }
    case "rollback": {
      if (!body.releaseId) return NextResponse.json({ error: "releaseId required" }, { status: 400 });
      return NextResponse.json({ release: await rollbackRelease(body.releaseId, "admin rollback") });
    }
    case "rollout": {
      if (!body.releaseId || body.percent == null) {
        return NextResponse.json({ error: "releaseId and percent required" }, { status: 400 });
      }
      return NextResponse.json({ release: await setRolloutPercent(body.releaseId, body.percent) });
    }
    case "add_tester": {
      if (!body.testerEmail || !body.releaseId) {
        return NextResponse.json({ error: "testerEmail and releaseId required" }, { status: 400 });
      }
      const tester = await upsertTester({ email: body.testerEmail, name: body.testerName });
      await assignTesterToRelease(tester.id, body.releaseId);
      return NextResponse.json({ tester });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
