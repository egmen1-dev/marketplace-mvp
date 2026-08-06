import Link from "next/link";

import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SIZE_PX = {
  sm: 32,
  md: 40,
  lg: 64,
} as const;

type LogoSize = keyof typeof SIZE_PX | number;

type LogoIconProps = {
  size?: LogoSize;
  className?: string;
  /** Decorative only when nested inside a labelled `Logo` link. */
  "aria-hidden"?: boolean | "true" | "false";
};

function resolvePx(size: LogoSize): number {
  return typeof size === "number" ? size : SIZE_PX[size];
}

/**
 * Lot mark — soft squircle + geometric Л with a lot-ticket fold and shelf.
 * Associations: brand letter, product lot, purchase tag. Scales 32–128px.
 */
export function LogoIcon({
  size = "md",
  className,
  "aria-hidden": ariaHidden = true,
}: LogoIconProps) {
  const px = resolvePx(size);

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={ariaHidden}
      className={cn(
        "shrink-0 text-primary [filter:drop-shadow(0_0_0_1px_rgb(255_106_0_/_28%))]",
        className,
      )}
    >
      {/* Soft squircle — product / lot tile (not a letter-circle) */}
      <rect width="32" height="32" rx="9" fill="currentColor" />
      {/* Contrast edge on #111 and white */}
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="8.25"
        stroke="var(--primary-foreground)"
        strokeOpacity="0.22"
        strokeWidth="1.25"
      />
      {/* Ticket fold — marketplace lot / price-tag cue */}
      <path
        d="M23 1.5 30.5 9H25.25A2.25 2.25 0 0 1 23 6.75V1.5Z"
        fill="var(--primary-foreground)"
        fillOpacity="0.28"
      />
      {/* Geometric Л — flat apex, open counter (not Latin A) */}
      <path
        d="M8.5 22.6 14.1 8.6h3.8l5.6 14H20.2L16.5 12.4h-1L11.8 22.6H8.5Z"
        fill="var(--primary-foreground)"
      />
      {/* Lot shelf — product resting on a lot */}
      <rect
        x="10.25"
        y="24.15"
        width="11.5"
        height="1.7"
        rx="0.85"
        fill="var(--primary-foreground)"
        fillOpacity="0.72"
      />
    </svg>
  );
}

type LogoProps = {
  /** `full` = icon + wordmark; `icon` = mark only; `responsive` = icon on xs, full from sm. */
  variant?: "full" | "icon" | "responsive";
  size?: LogoSize;
  className?: string;
  /** Wrap in home link (default true). */
  asLink?: boolean;
  href?: string;
};

export function Logo({
  variant = "full",
  size = "md",
  className,
  asLink = true,
  href = ROUTES.HOME,
}: LogoProps) {
  const px = resolvePx(size);
  const showWordmark = variant !== "icon";
  const responsiveWordmark = variant === "responsive";
  const wordmarkPx = Math.max(15, Math.round(px * 0.45));

  const content = (
    <>
      <LogoIcon size={px} />
      {showWordmark ? (
        <span
          className={cn(
            "font-heading font-semibold tracking-[-0.03em] text-foreground",
            responsiveWordmark && "hidden sm:inline",
          )}
          style={{ fontSize: wordmarkPx, lineHeight: 1 }}
        >
          {APP_NAME}
        </span>
      ) : null}
    </>
  );

  const shellClass = cn(
    "group inline-flex items-center gap-2.5 transition-opacity duration-[var(--duration-fast)] hover:opacity-90",
    className,
  );

  if (!asLink) {
    return (
      <span className={shellClass} aria-label={APP_NAME}>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={shellClass} aria-label={APP_NAME}>
      {content}
    </Link>
  );
}
