import Link from "next/link";
import {
  Activity,
  BarChart3,
  Flag,
  FlaskConical,
  HeartPulse,
  MessageSquare,
  Rocket,
  Settings2,
  Smartphone,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminOperationsDashboard } from "@/features/marketplace-foundation-audit";
import { getAdminOperationsOverview } from "@/lib/marketplace-foundation-audit";
import { ROUTES } from "@/lib/constants";
import { buildProductHealthSnapshot } from "@/lib/product-operations/health";
import { getProductAnalyticsOverview } from "@/lib/product-operations/analytics";
import { listProductFlags } from "@/lib/product-operations/feature-flags";
import { listRemoteConfigEntries } from "@/lib/product-operations/remote-config";
import { listExperiments } from "@/lib/product-operations/experiments";
import { buildProductTimeline } from "@/lib/product-operations/timeline";
import { getFeedbackSummary } from "@/lib/product-operations/feedback";

export const metadata = {
  title: "Operations",
};

export const dynamic = "force-dynamic";

const POP_LINKS = [
  { href: ROUTES.ADMIN_PRODUCT_HEALTH, label: "Product Health", icon: HeartPulse },
  { href: ROUTES.ADMIN_CLOSED_ALPHA, label: "Closed Alpha", icon: Users },
  { href: ROUTES.ADMIN_MOBILE_RELEASES, label: "Mobile Releases", icon: Smartphone },
  { href: ROUTES.ADMIN_SYSTEM_FLAGS, label: "System Flags", icon: Flag },
  { href: ROUTES.ADMIN_HEALTH, label: "Marketplace Health", icon: Activity },
  { href: ROUTES.ADMIN_CCOS, label: "CCOS", icon: FlaskConical },
] as const;

export default async function AdminOperationsPage() {
  const [overview, health, analytics, flags, configEntries, experiments, timeline, feedback] =
    await Promise.all([
      getAdminOperationsOverview(),
      buildProductHealthSnapshot(),
      getProductAnalyticsOverview(),
      listProductFlags(),
      listRemoteConfigEntries(),
      listExperiments(),
      buildProductTimeline(12),
      getFeedbackSummary(),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Operations</h2>
        <p className="text-sm text-muted-foreground">
          EPIC-79 Product Operations Platform — marketplace, mobile, releases, flags, health, analytics
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Product health</CardDescription>
            <CardTitle className="capitalize">{health.overall}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>DAU / MAU</CardDescription>
            <CardTitle>
              {analytics.dau} / {analytics.mau}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Feature flags (DB)</CardDescription>
            <CardTitle>{flags.filter((f) => f.source === "db").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remote config keys</CardDescription>
            <CardTitle>{configEntries.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Product Operations</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POP_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/40"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Product analytics
            </CardTitle>
            <CardDescription>30d conversion, GMV, sessions, crash-free</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>Orders 30d: {analytics.orders30d}</div>
            <div>GMV 30d: {Math.round(analytics.gmv30d).toLocaleString()} ₽</div>
            <div>Conversion: {analytics.conversionRate}%</div>
            <div>Retention 7d: {analytics.retention7d}%</div>
            <div>Sessions 24h: {analytics.sessions24h}</div>
            <div>Crash-free: {analytics.crashFreeRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Flags & experiments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Active flags: {flags.filter((f) => f.enabled).length}</div>
            <div>Experiments: {experiments.length}</div>
            <div>Running: {experiments.filter((e) => e.status === "running").length}</div>
            <p className="text-xs text-muted-foreground">
              Admin API: POST /api/admin/product-ops/flags · /config
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Feedback summary
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {Object.entries(feedback).map(([k, v]) => (
            <span key={k} className="rounded-full border border-border px-3 py-1">
              {k}: {v}
            </span>
          ))}
          {Object.keys(feedback).length === 0 ? (
            <span className="text-muted-foreground">No classified feedback yet</span>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-4 w-4" /> Product timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {timeline.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 border-b border-border pb-2">
                <span>
                  [{entry.type}] {entry.title}
                </span>
                <span className="text-muted-foreground">{entry.at.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seller Operations Health</CardTitle>
          <CardDescription>Live counts from marketplace data</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminOperationsDashboard overview={overview} />
        </CardContent>
      </Card>
    </div>
  );
}
