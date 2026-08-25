import Constants from "expo-constants";
import * as IntentLauncher from "expo-intent-launcher";
import { Linking, Platform } from "react-native";
import type { File } from "expo-file-system";

const FLAG_GRANT_READ_URI_PERMISSION = 1;

function androidPackageName(): string {
  return Constants.expoConfig?.android?.package ?? "ru.lot.marketplace.alpha";
}

export async function openUnknownSourcesSettings(): Promise<void> {
  if (Platform.OS !== "android") return;
  const packageName = androidPackageName();
  try {
    await IntentLauncher.startActivityAsync("android.settings.MANAGE_UNKNOWN_APP_SOURCES", {
      data: `package:${packageName}`,
    });
    return;
  } catch {
    // fall through to generic settings
  }
  await Linking.openSettings();
}

export async function openApkInstaller(file: File): Promise<"opened" | "permission_required"> {
  if (Platform.OS !== "android") {
    throw new Error("android_only");
  }

  const contentUri = file.contentUri;
  if (!contentUri) {
    throw new Error("content_uri_unavailable");
  }

  try {
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
      type: "application/vnd.android.package-archive",
    });
    return "opened";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/unknown sources|install permission|REQUEST_INSTALL_PACKAGES|security/i.test(message)) {
      return "permission_required";
    }
    throw err;
  }
}
