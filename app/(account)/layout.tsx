import {
  AccountMobileNav,
  AccountSidebar,
} from "@/features/account/components";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:gap-10">
      <aside className="animate-fade-up w-full shrink-0 lg:sticky lg:top-24 lg:w-56 lg:self-start">
        <div className="hidden rounded-2xl border border-border bg-card/50 p-3 shadow-card sm:p-4 lg:block">
          <AccountSidebar />
        </div>
        <div className="lg:hidden">
          <AccountMobileNav />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
