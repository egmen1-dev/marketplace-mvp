import { NextResponse } from "next/server";

import { withMobileApiContract } from "@/lib/mobile/api-contract";
import {
  CLOSED_ALPHA_APK,
  CLOSED_ALPHA_APK_DOWNLOAD_URL,
  CLOSED_ALPHA_GITHUB_RELEASE_URL,
} from "@/lib/mobile-release-platform/constants";

/** GET /api/mobile/releases/artifact — immutable APK metadata for installers */
export async function GET() {
  return NextResponse.json(
    withMobileApiContract(
      {
        versionName: CLOSED_ALPHA_APK.versionName,
        versionCode: CLOSED_ALPHA_APK.versionCode,
        sha256: CLOSED_ALPHA_APK.sha256,
        artifactSizeBytes: CLOSED_ALPHA_APK.artifactSizeBytes,
        artifactFileName: CLOSED_ALPHA_APK.artifactFileName,
        downloadUrl: CLOSED_ALPHA_APK_DOWNLOAD_URL,
        redirectUrl: `/api/mobile/releases/download/${encodeURIComponent(CLOSED_ALPHA_APK.versionName)}`,
        releasePageUrl: CLOSED_ALPHA_GITHUB_RELEASE_URL,
        channel: "closed_alpha",
        immutable: true,
      },
      CLOSED_ALPHA_APK.sha256,
    ),
  );
}
