import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

export type ApkIdentity = {
  packageName: string | null;
  versionCode: number | null;
  versionName: string | null;
  sizeBytes: number;
  sha256: string;
  signerSha256: string | null;
};

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function readApkIdentity(apkPath: string, aaptPath = "aapt", apksignerPath = "apksigner"): ApkIdentity {
  const bytes = readFileSync(apkPath);
  const aapt = execFileSync(aaptPath, ["dump", "badging", apkPath], { encoding: "utf8" });
  let signerSha256: string | null = null;
  try {
    const signerOut = execFileSync(apksignerPath, ["verify", "--print-certs", apkPath], { encoding: "utf8" });
    signerSha256 = signerOut.match(/SHA-256 digest:\s*([a-f0-9]+)/i)?.[1]?.toLowerCase() ?? null;
  } catch {
    signerSha256 = null;
  }
  return {
    packageName: aapt.match(/package: name='([^']+)'/)?.[1] ?? null,
    versionCode: Number(aapt.match(/versionCode='(\d+)'/)?.[1] ?? NaN) || null,
    versionName: aapt.match(/versionName='([^']+)'/)?.[1] ?? null,
    sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    signerSha256,
  };
}

export function readApkDexAndBundleText(apkPath: string): { dexContent: string; bundleContent: string; dexFiles: string[] } {
  const py = `
import sys, zipfile
apk = sys.argv[1]
z = zipfile.ZipFile(apk)
dex_files = [n for n in z.namelist() if n.endswith('.dex')]
dex = b''.join(z.read(n) for n in dex_files)
bundle = b''
for name in ('assets/index.android.bundle', 'assets/index.bundle'):
    if name in z.namelist():
        bundle = z.read(name)
        break
sys.stdout.write(dex.decode('latin1', errors='ignore'))
sys.stdout.write('\\n---BUNDLE---\\n')
sys.stdout.write(bundle.decode('utf-8', errors='ignore'))
`;
  const out = execFileSync("python3", ["-c", py, apkPath], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const [dexContent, bundleContent = ""] = out.split("\n---BUNDLE---\n", 2);
  const dexFiles = execFileSync(
    "python3",
    ["-c", "import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print('\\n'.join(n for n in z.namelist() if n.endswith('.dex')))", apkPath],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  return { dexContent, bundleContent, dexFiles };
}
