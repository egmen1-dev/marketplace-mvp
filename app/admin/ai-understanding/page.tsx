import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  listAdminBrands,
  listAdminUnderstandingCorrections,
} from "@/features/admin";

export const metadata = {
  title: "AI Product Understanding",
};

export default async function AdminAiUnderstandingPage() {
  const [brands, corrections] = await Promise.all([
    listAdminBrands(80),
    listAdminUnderstandingCorrections(40),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          AI Product Understanding
        </h2>
        <p className="text-sm text-muted-foreground">
          Suggestions → human confirm → save. Corrections feed the knowledge
          loop (no ML training yet). Brands are created lazily on confirm.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Corrections / applies</CardTitle>
          <CardDescription>
            Seller accept or correct signals from{" "}
            <code className="text-xs">/api/product-understanding</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {corrections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет записей</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Field</th>
                    <th className="py-2 pr-3 font-medium">Suggested</th>
                    <th className="py-2 pr-3 font-medium">Final</th>
                    <th className="py-2 font-medium">Title</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((c) => (
                    <tr key={c.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString("ru-RU")}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{c.field}</td>
                      <td className="py-2 pr-3">{c.suggested ?? "—"}</td>
                      <td className="py-2 pr-3">{c.corrected ?? "—"}</td>
                      <td className="py-2 max-w-[220px] truncate">
                        {c.title ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brands</CardTitle>
          <CardDescription>
            Entity table — no mass backfill. Aliases editable later via admin
            tools / seed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {brands.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Бренды появятся после подтверждения AI-предложения продавцом
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Slug</th>
                    <th className="py-2 pr-3 font-medium">Aliases</th>
                    <th className="py-2 font-medium">Products</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((b) => (
                    <tr key={b.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium">{b.name}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{b.slug}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {b.aliases.length ? b.aliases.join(", ") : "—"}
                      </td>
                      <td className="py-2">{b.productCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
