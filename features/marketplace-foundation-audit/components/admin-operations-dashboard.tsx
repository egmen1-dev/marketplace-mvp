import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import type { AdminOperationsOverview } from "@/lib/marketplace-foundation-audit/types";

type AdminOperationsDashboardProps = {
  overview: AdminOperationsOverview;
};

export function AdminOperationsDashboard({
  overview,
}: AdminOperationsDashboardProps) {
  if (!overview.enabled) {
    return (
      <Card data-testid="admin-operations-dashboard">
        <CardHeader>
          <CardTitle>Operations</CardTitle>
          <CardDescription>MARKETPLACE_FOUNDATION_AUDIT_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sections = [
    {
      id: "orders",
      title: "Orders",
      rows: [
        { label: "Новые", value: overview.orders.newCount, href: ROUTES.ADMIN_ORDERS },
        { label: "Проблемы (отмены 30д)", value: overview.orders.problemCount },
        { label: "Просрочки", value: overview.orders.overdueCount },
      ],
    },
    {
      id: "sellers",
      title: "Sellers",
      rows: [
        { label: "Новые (30д)", value: overview.sellers.newCount, href: ROUTES.ADMIN_SELLERS },
        { label: "Активные", value: overview.sellers.activeCount },
        { label: "Без продаж", value: overview.sellers.problemCount },
      ],
    },
    {
      id: "products",
      title: "Products",
      rows: [
        { label: "Черновики", value: overview.products.pendingReview, href: ROUTES.ADMIN_PRODUCTS },
        { label: "Скрытые", value: overview.products.rejected },
        { label: "Без продаж", value: overview.products.noSales },
      ],
    },
    {
      id: "finance",
      title: "Finance",
      rows: [
        { label: "Pending payments", value: overview.finance.pendingPayments, href: ROUTES.ADMIN_FINANCE },
        { label: "Pending payouts", value: overview.finance.pendingPayouts, href: ROUTES.ADMIN_PAYOUTS },
        { label: "Disputes", value: overview.finance.openDisputes },
      ],
    },
    {
      id: "trust",
      title: "Trust",
      rows: [
        { label: "Reports", value: overview.trust.openReports },
        { label: "Risk flags", value: overview.trust.riskFlags },
      ],
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="admin-operations-dashboard">
      {sections.map((section) => (
        <Card key={section.id} data-testid={`operations-${section.id}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {section.rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{row.label}</span>
                {"href" in row && row.href ? (
                  <Link href={row.href} className="font-medium tabular-nums">
                    {row.value}
                  </Link>
                ) : (
                  <span className="font-medium tabular-nums">{row.value}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
