import * as Clipboard from "expo-clipboard";
import { Alert, Share } from "react-native";

import type { DiagnosticsReport } from "../../../../lib/mobile/diagnostics/types";
import { formatDiagnosticsJson, formatDiagnosticsText } from "../../../../lib/mobile/diagnostics/format-report";

export async function copyDiagnosticsText(report: DiagnosticsReport): Promise<void> {
  const text = formatDiagnosticsText(report);
  await Clipboard.setStringAsync(text);
  Alert.alert("Скопировано", "Диагностика скопирована в буфер обмена");
}

export async function exportDiagnosticsJson(report: DiagnosticsReport): Promise<void> {
  const json = formatDiagnosticsJson(report);
  await Share.share({
    title: "LOT Diagnostics Report",
    message: json,
  });
}

export async function shareProblemReport(report: DiagnosticsReport, userNote: string): Promise<void> {
  const json = formatDiagnosticsJson(report);
  const text = [
    "LOT — сообщение о проблеме",
    "",
    "Что произошло:",
    userNote.trim() || "(не указано)",
    "",
    "DiagnosticsReport:",
    json,
  ].join("\n");

  await Share.share({
    title: "LOT Problem Report",
    message: text,
  });
}
