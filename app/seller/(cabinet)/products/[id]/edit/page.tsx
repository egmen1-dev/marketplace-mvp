import { redirect } from "next/navigation";

import { sellerProductEditPath } from "@/lib/constants";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SellerEditProductRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(sellerProductEditPath(id));
}
