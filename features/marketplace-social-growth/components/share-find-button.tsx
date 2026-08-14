"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  generateShareCardAction,
  trackContentSharedAction,
  trackShareChannelAction,
} from "@/lib/marketplace-social-growth/actions";
import { shareCardAspectClass } from "@/lib/marketplace-social-growth/share-cards";
import type { ShareCardData } from "@/lib/marketplace-social-growth/types";
import { trackShareCardView } from "@/lib/marketplace-social-growth/analytics";

type ShareFindButtonProps = {
  productId: string;
  label?: string;
};

export function ShareFindButton({
  productId,
  label = "🔥 Поделиться находкой",
}: ShareFindButtonProps) {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<ShareCardData | null>(null);
  const [pending, startTransition] = useTransition();

  function openModal() {
    setOpen(true);
    trackShareCardView(productId);
    startTransition(async () => {
      const result = await generateShareCardAction({ productId });
      setCard(result.card);
    });
  }

  async function copyLink() {
    if (!card) return;
    await navigator.clipboard.writeText(card.shareUrl);
    trackContentSharedAction(productId);
  }

  function shareTelegram() {
    if (!card) return;
    trackShareChannelAction({ productId, channel: "telegram" });
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(card.shareUrl)}&text=${encodeURIComponent(card.headline)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function shareVk() {
    if (!card) return;
    trackShareChannelAction({ productId, channel: "vk" });
    window.open(
      `https://vk.com/share.php?url=${encodeURIComponent(card.shareUrl)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openModal}
        data-testid="share-find-button"
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6"
        data-testid="share-card-modal"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-heading text-lg font-semibold">Поделиться находкой</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            ✕
          </Button>
        </div>

        {pending || !card ? (
          <p className="mt-4 text-sm text-muted-foreground">Готовим карточку…</p>
        ) : (
          <>
            <div
              className={`mx-auto mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-4 ${shareCardAspectClass(card.format)}`}
            >
              <p className="text-sm font-medium text-primary">{card.headline}</p>
              {card.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.imageUrl}
                  alt={card.title}
                  className="mt-3 aspect-square w-full rounded-xl object-cover"
                />
              ) : null}
              <p className="mt-3 font-medium">{card.title}</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {card.reasons.map((r) => (
                  <li key={r}>✓ {r}</li>
                ))}
              </ul>
              <p className="mt-3 font-heading text-xl text-primary">{card.priceLabel}</p>
              <p className="mt-2 text-xs text-muted-foreground">{card.ctaLabel}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={copyLink}>
                Скопировать ссылку
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={shareTelegram}>
                Telegram
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={shareVk}>
                VK
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
