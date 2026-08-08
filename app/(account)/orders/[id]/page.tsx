import { redirect } from "next/navigation";

import { orderPath } from "@/lib/constants";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** @deprecated Use `/account/orders/[id]` */
export default async function LegacyOrderDetailRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(orderPath(id));
}
