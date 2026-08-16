/** Android APK update metadata contract — foundation only (no binary yet) */

export type AndroidUpdatePayload = {
  versionCode: number;
  versionName: string;
  minimumVersion: string;
  minimumSupportedVersionCode: number;
  latestVersion: string;
  updateRequired: boolean;
  downloadUrl: string | null;
  sha256: string | null;
  releaseNotes: string[];
  publishedAt: string | null;
  advisoryOnly: true;
};

export function buildAndroidUpdatePayload(): AndroidUpdatePayload {
  return {
    versionCode: 1,
    versionName: "0.0.0-dev",
    minimumVersion: "0.0.0-dev",
    minimumSupportedVersionCode: 1,
    latestVersion: "0.0.0-dev",
    updateRequired: false,
    downloadUrl: null,
    sha256: null,
    releaseNotes: ["APK distribution foundation — no binary published yet"],
    publishedAt: null,
    advisoryOnly: true,
  };
}
