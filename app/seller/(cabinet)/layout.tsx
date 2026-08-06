import { SellerNav } from "@/features/seller";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start lg:gap-10">
      <aside className="w-full shrink-0 border-b border-border pb-4 lg:w-52 lg:border-b-0 lg:pb-0">
        <SellerNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
