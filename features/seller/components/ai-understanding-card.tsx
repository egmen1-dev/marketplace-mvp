"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProductUnderstandingResult } from "@/lib/product-understanding/types";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  disabled?: boolean;
  onApply: (result: ProductUnderstandingResult) => void;
};

function levelBadge(level: string) {
  if (level === "high") return "default" as const;
  if (level === "medium") return "secondary" as const;
  return "outline" as const;
}

export function AiUnderstandingCard({
  title,
  description,
  disabled,
  onApply,
}: Props) {
  const [result, setResult] = useState<ProductUnderstandingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
    if (title.trim().length < 5) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetch("/api/product-understanding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description?.trim() || null,
        }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error("fail");
          return r.json() as Promise<ProductUnderstandingResult>;
        })
        .then((data) => {
          if (!cancelled) setResult(data);
        })
        .catch(() => {
          if (!cancelled) {
            setError("Не удалось проанализировать название");
            setResult(null);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [title, description]);

  if (dismissed) return null;
  if (title.trim().length < 5 && !loading) return null;

  const overall = result?.confidence.overall;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/30 p-4",
        overall?.level === "low" && "border-amber-500/40",
      )}
      data-testid="ai-understanding-card"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <span className="text-sm font-medium">AI-анализ названия</span>
        {loading ? (
          <span className="text-xs text-muted-foreground">анализ…</span>
        ) : null}
        {overall ? (
          <Badge variant={levelBadge(overall.level)}>
            уверенность {(overall.score * 100).toFixed(0)}%
          </Badge>
        ) : null}
        <span className="text-xs text-muted-foreground">
          правила · подтвердите перед публикацией
        </span>
      </div>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}

      {result && !loading ? (
        <div className="space-y-2 text-sm">
          {result.productTypeSuggestion ? (
            <Row
              label="Тип"
              value={result.productTypeSuggestion.name}
              level={result.productTypeSuggestion.confidence.level}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Тип товара не определён — выберите вручную
            </p>
          )}
          {result.categorySuggestion?.name ? (
            <Row
              label="Категория"
              value={result.categorySuggestion.name}
              level={result.categorySuggestion.confidence.level}
            />
          ) : null}
          {result.brand ? (
            <Row
              label="Бренд"
              value={result.brand.name}
              level={result.brand.confidence.level}
            />
          ) : null}
          {result.model ? (
            <Row
              label="Модель"
              value={result.model.name}
              level={result.model.confidence.level}
            />
          ) : null}
          {result.characteristics.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground">Характеристики</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {result.characteristics.map((c) => (
                  <li key={c.slug + (c.definitionId ?? "")}>
                    {c.name}:{" "}
                    {c.valueText ??
                      (c.valueNumber != null ? String(c.valueNumber) : "—")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.seo.title ? (
            <Row label="SEO" value={result.seo.title} level="medium" />
          ) : null}

          {overall?.level === "low" ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Низкая уверенность — проверьте поля вручную
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              disabled={disabled || !result.productTypeSuggestion}
              onClick={() => onApply(result)}
              data-testid="ai-understanding-apply"
            >
              Применить предложение
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
            >
              Скрыть
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  level,
}: {
  label: string;
  value: string;
  level: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
      <Badge variant={levelBadge(level)} className="text-[10px]">
        {level}
      </Badge>
    </div>
  );
}
