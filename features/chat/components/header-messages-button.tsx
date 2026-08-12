import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { headerActionClassName } from "@/components/layout/header-action";
import { Button } from "@/components/ui/button";
import { getSessionUser, loadUserAuthFromDb } from "@/features/auth";
import { countUnreadMessagesForUser } from "@/features/chat/queries";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Always occupies the same header slot (guest → sign-in link).
 * Returning `null` for guests shifted sibling client islands’ useId paths
 * and caused intermittent React #418 under Playwright load.
 */
export async function HeaderMessagesButton() {
  const session = await getSessionUser();
  if (!session) {
    return (
      <Button
        variant="ghost"
        size="icon-header"
        className={headerActionClassName("relative")}
        title="Сообщения"
        nativeButton={false}
        render={
          <Link
            href={`${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.ACCOUNT_MESSAGES)}`}
            aria-label="Сообщения"
            data-testid="header-messages"
          />
        }
      >
        <MessageCircle aria-hidden />
      </Button>
    );
  }

  const dbUser = await loadUserAuthFromDb(session.id);
  if (!dbUser) {
    return (
      <Button
        variant="ghost"
        size="icon-header"
        className={headerActionClassName("relative")}
        title="Сообщения"
        nativeButton={false}
        render={
          <Link
            href={`${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.ACCOUNT_MESSAGES)}`}
            aria-label="Сообщения"
            data-testid="header-messages"
          />
        }
      >
        <MessageCircle aria-hidden />
      </Button>
    );
  }

  const unread = await countUnreadMessagesForUser({
    userId: dbUser.id,
    sellerProfileId: dbUser.sellerProfileId,
  });
  const showBadge = unread > 0;

  return (
    <Button
      variant="ghost"
      size="icon-header"
      className={headerActionClassName("relative")}
      title="Сообщения"
      nativeButton={false}
      render={
        <Link
          href={ROUTES.ACCOUNT_MESSAGES}
          aria-label={
            showBadge
              ? `Сообщения, непрочитанных: ${unread}`
              : "Сообщения"
          }
          data-testid="header-messages"
        />
      }
    >
      <MessageCircle aria-hidden />
      {showBadge ? (
        <span
          className={cn(
            "absolute top-0.5 right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] leading-none font-bold text-white shadow-sm ring-2 ring-background",
          )}
          aria-hidden
          data-testid="header-messages-badge"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Button>
  );
}
