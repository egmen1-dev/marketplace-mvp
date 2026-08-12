export function BootSplash() {
  return (
    <div
      id="boot-splash"
      className="boot-splash"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="boot-splash-inner">
        <div className="boot-splash-spinner" aria-hidden />
        <p className="boot-splash-text font-heading text-sm font-medium text-foreground">
          Загрузка…
        </p>
      </div>
    </div>
  );
}
