function Block({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className ?? ""}`}
      aria-hidden
    />
  );
}

export function SellerPublicPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card/50 p-6 sm:flex-row">
        <Block className="size-24 shrink-0 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-3">
          <Block className="h-8 w-2/3 max-w-sm" />
          <Block className="h-4 w-24" />
          <div className="flex gap-2">
            <Block className="h-6 w-28 rounded-full" />
            <Block className="h-6 w-36 rounded-full" />
          </div>
          <Block className="h-4 w-full max-w-xl" />
          <Block className="h-4 w-48" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Block className="h-7 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} className="aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
