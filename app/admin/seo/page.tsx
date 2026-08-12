import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminSeoPanel } from "@/features/admin/components/admin-seo-panel";
import { listAdminSeoPages } from "@/lib/seo/queries";
import { buildSeoOpportunities } from "@/lib/seo/opportunities";

export const metadata = { title: "SEO Center" };

export default async function AdminSeoPage() {
  const pages = await listAdminSeoPages(80);
  const opportunities = buildSeoOpportunities({
    topCategorySlugs: ["tools", "electronics", "construction"],
    popularQueries: ["перфоратор", "тепловая пушка", "makita"],
    emptyQueries: [],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          SEO Growth Center
        </h2>
        <p className="text-sm text-muted-foreground">
          Controlled landings · quality score · AI drafts require approval.
          Mass facet pages are not auto-created.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SEO pages</CardTitle>
          <CardDescription>
            Approve to index · Disable indexing for thin pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSeoPanel
            pages={pages.map((p) => ({
              id: p.id,
              entityType: p.entityType,
              path: p.path,
              title: p.title,
              status: p.status,
              indexable: p.indexable,
              score: p.score,
              updatedAt: p.updatedAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO opportunities</CardTitle>
          <CardDescription>
            Search Intelligence loop foundation (A-007+)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {opportunities.map((o) => (
              <li key={`${o.kind}-${o.query}`} className="rounded-lg border border-border px-3 py-2">
                <span className="font-medium">{o.query}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {o.kind} → {o.suggestedEntity}
                </span>
                <p className="text-xs text-muted-foreground">{o.note}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
