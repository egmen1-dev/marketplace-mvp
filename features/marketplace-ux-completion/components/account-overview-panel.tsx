import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { AccountOverview } from "@/lib/marketplace-ux-completion/types";

import { AccountModeSwitch } from "./account-mode-switch";

type AccountOverviewPanelProps = {
  overview: AccountOverview;
};

export function AccountOverviewPanel({ overview }: AccountOverviewPanelProps) {
  if (!overview.enabled) return null;

  return (
    <div className="flex flex-col gap-6" data-testid="account-overview-panel">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-card p-6">
        <p className="text-sm text-primary">Мой аккаунт</p>
        <h2 className="mt-1 font-heading text-2xl font-semibold">{overview.profile.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{overview.profile.email}</p>
        <div className="mt-4">
          <AccountModeSwitch mode={overview.mode} isSeller={overview.isSeller} />
        </div>
      </div>

      {overview.sections.map((section) => (
        <section key={section.id} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold">{section.title}</h3>
          <ul className="mt-3 divide-y divide-border">
            {section.items.map((item) => (
              <li key={item.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <Link href={item.href} className="text-sm font-medium text-primary hover:underline">
                  {item.value}
                </Link>
              </li>
            ))}
          </ul>
          {section.id === "wallet" && overview.walletSnapshot ? (
            <Button
              className="mt-4 min-h-12 w-full sm:w-auto"
              nativeButton={false}
              render={<Link href={overview.walletSnapshot.href} />}
            >
              Открыть кошелёк
            </Button>
          ) : null}
        </section>
      ))}
    </div>
  );
}
