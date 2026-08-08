/**
 * Legacy seller cabinet — pages redirect to `/account/*`.
 * No SellerProfile gate: buyers following old links land in the unified
 * cabinet; seller sections enforce access themselves.
 */
export default function SellerCabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
