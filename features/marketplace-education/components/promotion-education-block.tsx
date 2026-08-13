type PromotionEducationBlockProps = {
  route: string;
};

export function PromotionEducationBlock({ route }: PromotionEducationBlockProps) {
  return (
    <div
      className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm"
      data-testid="promotion-education-block"
    >
      <p className="font-medium">Как работает продвижение</p>
      <p className="mt-1 text-muted-foreground">
        Продвижение помогает увеличить количество показов, быстрее проверить
        спрос и получить статистику. Мы не обещаем продажи — решение остаётся за
        покупателем.
      </p>
    </div>
  );
}
