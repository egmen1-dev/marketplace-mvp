import { ROUTES } from "@/lib/constants";
import type { SellerDashboardStats } from "@/features/seller/queries";
import type { SellerJourneyCoach } from "@/lib/seller-journey/types";

export type OperatingDeskIssueSeverity = "critical" | "warning" | "info";

export type OperatingDeskIssue = {
  id: string;
  severity: OperatingDeskIssueSeverity;
  title: string;
  description: string;
  why: string;
  ctaLabel: string;
  ctaHref: string;
};

export type OperatingDeskAction = {
  id: string;
  priority: number;
  title: string;
  why: string;
  ctaLabel: string;
  ctaHref: string;
};

export type OperatingDeskMoneySnapshot = {
  pendingAmount: number;
  availableAmount: number;
  paidAmount: number;
  headline: string;
  explanation: string;
  ctaLabel: string;
  ctaHref: string;
};

export type OperatingDeskNowSnapshot = {
  headline: string;
  summary: string;
  stats: SellerDashboardStats;
  orderCounters: {
    newCount: number;
    inProgress: number;
    awaitingShipment: number;
    readyForPickup: number;
    overdue: number;
  };
};

export type SellerOperatingDeskDashboard = {
  enabled: boolean;
  now: OperatingDeskNowSnapshot;
  issues: OperatingDeskIssue[];
  todayActions: OperatingDeskAction[];
  money: OperatingDeskMoneySnapshot;
  coach: SellerJourneyCoach | null;
};

export const OPERATING_DESK_HOME = ROUTES.ACCOUNT_BUSINESS;
