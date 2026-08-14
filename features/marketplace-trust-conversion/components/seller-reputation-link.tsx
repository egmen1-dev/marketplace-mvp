"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { trackSellerReputationOpenClient } from "./trust-conversion-trackers";

type SellerReputationLinkProps = ComponentProps<typeof Link> & {
  sellerId: string;
};

export function SellerReputationLink({
  sellerId,
  href,
  onClick,
  children,
  ...props
}: SellerReputationLinkProps) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        trackSellerReputationOpenClient(sellerId, typeof href === "string" ? href : "");
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
