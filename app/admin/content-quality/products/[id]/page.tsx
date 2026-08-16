import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getProductQuality, isMarketplaceContentQualityEnabled } from "@/lib/marketplace-content-quality";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type AdminContentQualityProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminContentQualityProductPage({
  params,
}: AdminContentQualityProductPageProps) {
  const { id } = await params;
  if (!isMarketplaceContentQualityEnabled()) {
    return (
      <p className="text-sm text-muted-foreground">
        Content Quality Intelligence выключен на этом окружении.
      </p>
    );
  }

  const snapshot = await getProductQuality(id);
  if (!snapshot) notFound();

  const evaluation = snapshot.evaluation;

  return (
    <div className="flex flex-col gap-6" data-testid="admin-content-quality-product">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 text-muted-foreground"
            nativeButton={false}
            render={<Link href={ROUTES.ADMIN_CONTENT_QUALITY} />}
          >
            ← Content Quality Center
          </Button>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Quality Evaluation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Product {id}</p>
        </div>
        <div className="rounded-xl border px-4 py-3 text-right">
          <p className="text-xs text-muted-foreground">Качество карточки</p>
          <p className="text-2xl font-semibold tabular-nums">{snapshot.overallScore}/100</p>
          <p className="text-xs text-muted-foreground">
            confidence {Math.round(snapshot.confidence * 100)}%
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h2 className="font-medium">Provider</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Provider</dt>
              <dd>{snapshot.provider}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">qualityModelVersion</dt>
              <dd>{snapshot.qualityModelVersion}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">criticVersion</dt>
              <dd>{snapshot.criticVersion}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">providerVersion</dt>
              <dd>{snapshot.providerVersion}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">evaluatedAt</dt>
              <dd>{snapshot.evaluatedAt}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">DAOS</dt>
              <dd>{evaluation.daosUsed ? "CONNECTED (merged)" : "NOT CONNECTED (fallback)"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border p-4">
          <h2 className="font-medium">Hard gates</h2>
          <p className="mt-1 text-sm">
            TOP eligibility:{" "}
            <strong>{snapshot.topEligibility === "BLOCKED" ? "BLOCKED" : "ELIGIBLE"}</strong>
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {snapshot.failedGates.length === 0 ? (
              <li className="text-muted-foreground">Нет hard gate failures</li>
            ) : (
              snapshot.failedGates.map((gate) => (
                <li key={gate}>{gate}</li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium">Critic evidence</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {evaluation.photo.images.map((img) => (
            <li key={img.imageId} className="flex gap-3 border-b border-border/50 pb-2 last:border-0">
              <img src={img.url} alt="" className="h-14 w-14 rounded-md border object-cover" />
              <div>
                <p>
                  Image #{img.index}: {img.score}/100 · relevance {img.relevance}/100
                </p>
                <p className="text-muted-foreground">{img.evidence.reasons.join("; ")}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
