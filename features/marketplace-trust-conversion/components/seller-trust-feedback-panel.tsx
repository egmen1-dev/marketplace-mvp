import type { SellerTrustFeedbackSnapshot } from "@/lib/marketplace-trust-conversion/types";

type SellerTrustFeedbackPanelProps = {
  feedback: SellerTrustFeedbackSnapshot;
};

export function SellerTrustFeedbackPanel({ feedback }: SellerTrustFeedbackPanelProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      data-testid="seller-trust-feedback"
    >
      <h3 className="font-heading text-lg font-semibold">Обратная связь от покупателей</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Что чаще всего вызывает сомнения при просмотре ваших товаров
      </p>

      {feedback.doubts.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-medium">Покупатели чаще всего сомневаются:</p>
          <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
            {feedback.doubts.map((item) => (
              <li key={item.rank}>
                {item.rank}. {item.problem}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl bg-primary/5 px-4 py-3">
        <p className="text-sm font-medium">Что исправить:</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {feedback.fixes.map((fix) => (
            <li key={fix}>• {fix}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
