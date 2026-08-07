type AccountShellProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

/** Page header + content inside the shared account layout. */
export function AccountShell({
  children,
  title,
  description,
  actions,
}: AccountShellProps) {
  return (
    <>
      <div className="animate-fade-up mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </>
  );
}
