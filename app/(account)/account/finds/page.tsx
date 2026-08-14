import { redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth";
import { UserCollectionsPanel } from "@/features/marketplace-social-growth";
import {
  isSocialCollectionsEnabled,
  listUserCollections,
} from "@/lib/marketplace-social-growth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Мои находки" };

export default async function AccountFindsPage() {
  if (!isSocialCollectionsEnabled()) {
    return (
      <p className="text-sm text-muted-foreground">
        SOCIAL_COLLECTIONS_ENABLED=false
      </p>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect(`${ROUTES.AUTH_SIGN_IN}?callbackUrl=${ROUTES.ACCOUNT_FINDS}`);

  const collections = await listUserCollections(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Мои находки
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Сохраняйте товары в подборки и делитесь ссылкой
        </p>
      </div>
      <UserCollectionsPanel collections={collections} />
    </div>
  );
}
