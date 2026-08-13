"use client";

import { useEffect } from "react";
import { BrainCircuit } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import type { AdminLearningCenterDashboard } from "@/lib/marketplace-learning/types";

type AdminLearningCenterPanelProps = {
  data: AdminLearningCenterDashboard;
};

export function AdminLearningCenterPanel({
  data,
}: AdminLearningCenterPanelProps) {
  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.AI_RECOMMENDATION_QUALITY,
      route: ROUTES.ADMIN_LEARNING,
      entityId: String(data.aiAccuracy.score),
    });
  }, [data.enabled, data.aiAccuracy.score]);

  if (!data.enabled) {
    return (
      <Card data-testid="admin-learning-center-panel">
        <CardHeader>
          <CardTitle>Learning Center</CardTitle>
          <CardDescription>MARKETPLACE_LEARNING_ENABLED=false</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-learning-center-panel">
      <Section
        title="Marketplace experiments"
        testId="admin-learning-experiments"
        items={data.marketplaceExperiments}
      />
      <section data-testid="admin-learning-patterns">
        <div className="mb-3 flex items-center gap-2">
          <BrainCircuit className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">
            Successful patterns
          </h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {data.successfulPatterns.map((pattern) => (
            <Card key={pattern.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{pattern.statement}</CardTitle>
                <CardDescription>
                  Confidence {pattern.confidence}% · sample {pattern.sampleSize}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
      <Section
        title="Failed recommendations"
        testId="admin-learning-failed"
        items={data.failedRecommendations}
      />
      <section data-testid="admin-learning-accuracy">
        <h3 className="mb-3 font-heading text-lg font-semibold">AI accuracy</h3>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Recommendation quality: {data.aiAccuracy.score}/100
            </CardTitle>
            <CardDescription>{data.aiAccuracy.label}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{data.aiAccuracy.summary}</p>
            <p className="mt-2">
              Accepted {data.aiAccuracy.accepted} · Improved{" "}
              {data.aiAccuracy.improved} · Total {data.aiAccuracy.total}
            </p>
          </CardContent>
        </Card>
      </section>
      <section data-testid="admin-learning-knowledge">
        <h3 className="mb-3 font-heading text-lg font-semibold">
          Knowledge base
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {data.knowledgeBase.slice(0, 6).map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{entry.title}</CardTitle>
                <CardDescription>{entry.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function Section({
  title,
  testId,
  items,
}: {
  title: string;
  testId: string;
  items: Array<{ id: string; title: string; body: string; badge?: string }>;
}) {
  return (
    <section data-testid={testId}>
      <h3 className="mb-3 font-heading text-lg font-semibold">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>{item.title}</span>
                {item.badge ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {item.badge}
                  </span>
                ) : null}
              </CardTitle>
              <CardDescription>{item.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
