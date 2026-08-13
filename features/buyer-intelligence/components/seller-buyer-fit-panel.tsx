import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SellerBuyerFitSummary } from "@/lib/buyer-intelligence/types";

type SellerBuyerFitPanelProps = {
  summary: SellerBuyerFitSummary;
};

export function SellerBuyerFitPanel({ summary }: SellerBuyerFitPanelProps) {
  return (
    <Card
      className="border-dashed"
      data-testid="seller-buyer-fit-panel"
    >
      <CardHeader>
        <CardTitle className="text-base">Почему покупают ваш товар</CardTitle>
        <CardDescription>
          Аналитика намерений покупателей — только для вашего понимания спроса.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium">Ваш товар чаще подходит:</p>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          {summary.fitReasons.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {summary.typicalBudget ? (
          <p className="text-xs text-muted-foreground">
            Типичный бюджет покупателей: {summary.typicalBudget}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
