import { AccountSidebar } from "@/features/account/components/account-sidebar";

type AccountShellProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function AccountShell({
  children,
  title,
  description,
  actions,
}: AccountShellProps) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:gap-10">
      <aside className="animate-fade-up w-full shrink-0 lg:w-56">
        <div className="rounded-2xl border border-border bg-card/50 p-3 shadow-card sm:p-4">
          <AccountSidebar />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
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
      </div>
    </div>
  );
}
