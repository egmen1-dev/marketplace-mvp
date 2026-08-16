/** Android APK update metadata contract — foundation only (no binary yet) */

export type AndroidUpdatePayload = {
  latestVersion: string;
  minimumVersion: string;
  updateRequired: boolean;
  downloadUrl: string | null;
  sha256: string | null;
  releaseNotes: string[];
  advisoryOnly: true;
};

export function buildAndroidUpdatePayload(): AndroidUpdatePayload {
  return {
    latestVersion: "0.0.0-dev",
    minimumVersion: "0.0.0-dev",
    updateRequired: false,
    downloadUrl: null,
    sha256: null,
    releaseNotes: ["APK distribution foundation — no binary published yet"],
    advisoryOnly: true,
  };
}
