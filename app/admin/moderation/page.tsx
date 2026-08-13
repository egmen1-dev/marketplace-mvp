import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminModerationPanel } from "@/features/marketplace-trust-loop";
import {
  getModerationQueueSummary,
  listModerationQueue,
} from "@/lib/marketplace-trust-loop";

export const metadata = { title: "Moderation" };

export default async function AdminModerationPage() {
  const [queue, summary] = await Promise.all([
    listModerationQueue(30),
    getModerationQueueSummary(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Moderation
        </h2>
        <p className="text-sm text-muted-foreground">
          Очередь проверки товаров, отзывов и подозрительного контента
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue</CardTitle>
          <CardDescription>Rule-based checks — AI advisory only</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminModerationPanel queue={queue} summary={summary} />
        </CardContent>
      </Card>
    </div>
  );
}
