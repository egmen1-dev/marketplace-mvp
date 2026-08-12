export default function RootLoading() {
  return (
    <div
      className="mx-auto flex min-h-[40vh] max-w-7xl flex-col items-center justify-center gap-4 px-4 py-16"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="route-loading"
    >
      <div className="boot-splash-spinner" aria-hidden />
      <p className="text-sm text-muted-foreground">Загрузка…</p>
    </div>
  );
}
