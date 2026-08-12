"use client";

import { useEffect, useState } from "react";

import { formatChatStampMoscow } from "@/lib/format/datetime";

type Mode = "list" | "thread";

/**
 * SSR and first client paint share deterministic absolute labels.
 * Relative “today” labels apply only after mount.
 */
export function ChatRelativeTime({
  iso,
  mode = "list",
  className,
}: {
  iso: string;
  mode?: Mode;
  className?: string;
}) {
  const absolute = formatChatStampMoscow(iso, mode);
  const [label, setLabel] = useState(absolute);

  useEffect(() => {
    if (mode === "thread") {
      setLabel(formatChatStampMoscow(iso, mode));
      return;
    }
    const d = new Date(iso);
    const now = new Date();
    // Compare calendar day in Moscow
    const mskNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const mskMsg = new Date(d.getTime() + 3 * 60 * 60 * 1000);
    const sameMskDay =
      mskNow.getUTCFullYear() === mskMsg.getUTCFullYear() &&
      mskNow.getUTCMonth() === mskMsg.getUTCMonth() &&
      mskNow.getUTCDate() === mskMsg.getUTCDate();
    if (sameMskDay) {
      const hour = String(mskMsg.getUTCHours()).padStart(2, "0");
      const minute = String(mskMsg.getUTCMinutes()).padStart(2, "0");
      setLabel(`${hour}:${minute}`);
    } else {
      setLabel(formatChatStampMoscow(iso, mode));
    }
  }, [iso, mode]);

  return <span className={className}>{label}</span>;
}
