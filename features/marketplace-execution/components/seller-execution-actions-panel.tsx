import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SellerExecutionAction } from "@/lib/marketplace-execution/types";

type SellerExecutionActionsPanelProps = {
  actions: SellerExecutionAction[];
};

export function SellerExecutionActionsPanel({
  actions,
}: SellerExecutionActionsPanelProps) {
  if (actions.length === 0) return null;

  return (
    <Card
      className="border-emerald-500/20 bg-emerald-500/5"
      data-testid="seller-execution-actions"
    >
      <CardHeader>
        <CardTitle className="text-base">Marketplace Execution</CardTitle>
        <CardDescription>
          Как выполнить рекомендации — только с вашим подтверждением.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.map((action) => (
          <div
            key={action.taskId}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            data-testid={`seller-execution-action-${action.taskId}`}
          >
            <div>
              <p className="font-medium">{action.headline}</p>
              <p className="text-sm text-muted-foreground">
                {action.description}
              </p>
            </div>
            <Button
              size="sm"
              className="w-fit rounded-xl"
              nativeButton={false}
              render={<Link href={action.href} />}
            >
              {action.fixLabel}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
