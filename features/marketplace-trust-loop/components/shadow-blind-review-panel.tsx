"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  product: {
    id: string;
    title: string;
    description: string | null;
    contentVersion: number;
    category: { name: string; slug: string } | null;
    productType: { name: string; slug: string } | null;
    images: Array<{ id: string; url: string; alt: string | null }>;
    characteristics: Array<{ name: string; value: unknown }>;
  };
  batchId: string;
};

export function ShadowBlindReviewPanel({ product, batchId }: Props) {
  const [decision, setDecision] = useState<string>("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!decision) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shadow-review/${product.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, humanDecision: decision, humanReason: reason || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "submit failed");
      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="shadow-blind-review-panel">
      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Blind review (Policy V2 shadow)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          System recommendation is hidden until you submit your decision. This does not publish or reject the LOT.
        </p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Title</dt>
            <dd className="font-medium">{product.title}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Description</dt>
            <dd>{product.description ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Category</dt>
            <dd>{product.category?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Content version</dt>
            <dd>{product.contentVersion}</dd>
          </div>
        </dl>
        {product.images.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {product.images.map((img) => (
              <img key={img.id} src={img.url} alt={img.alt ?? ""} className="h-24 w-24 rounded object-cover" />
            ))}
          </div>
        ) : null}
      </section>

      {!result ? (
        <section className="rounded-lg border p-4">
          <h3 className="font-medium">Your decision</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["APPROVE", "NEEDS_CHANGES", "REJECT", "MANUAL_REVIEW"] as const).map((d) => (
              <Button key={d} variant={decision === d ? "default" : "outline"} size="sm" onClick={() => setDecision(d)}>
                {d}
              </Button>
            ))}
          </div>
          <textarea
            className="mt-3 w-full rounded border p-2 text-sm"
            rows={3}
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          <Button className="mt-3" disabled={!decision || pending} onClick={submit}>
            Submit blind decision
          </Button>
        </section>
      ) : (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4" data-testid="shadow-review-reveal">
          <h3 className="font-medium">System comparison (revealed)</h3>
          <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre>
          <Link href="/admin/shadow-review">
            <Button className="mt-3" variant="secondary" type="button">
              Back to queue
            </Button>
          </Link>
        </section>
      )}
    </div>
  );
}
