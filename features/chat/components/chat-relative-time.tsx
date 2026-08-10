"use client";

import { useEffect, useState } from "react";

type Mode = "list" | "thread";

/**
 * Locale dates render only after mount so SSR HTML matches the first client
 * paint (avoids React #418 from Node vs browser `toLocale*` differences).
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
  const [label, setLabel] = useState("");

  useEffect(() => {
    const d = new Date(iso);
    if (mode === "thread") {
      setLabel(
        d.toLocaleString("ru-RU", {
          timeZone: "Europe/Moscow",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      return;
    }
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    setLabel(
      sameDay
        ? d.toLocaleTimeString("ru-RU", {
            timeZone: "Europe/Moscow",
            hour: "2-digit",
            minute: "2-digit",
          })
        : d.toLocaleDateString("ru-RU", {
            timeZone: "Europe/Moscow",
            day: "numeric",
            month: "short",
          }),
    );
  }, [iso, mode]);

  return (
    <span className={className} suppressHydrationWarning>
      {label || "\u00a0"}
    </span>
  );
}
