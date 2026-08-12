import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/features/account/types";
import { formatDateMoscow } from "@/lib/format/datetime";
import { ROUTES } from "@/lib/constants";

type ProfileViewProps = {
  profile: UserProfile;
  editHref?: string;
};

function formatRegDate(iso: string): string {
  return formatDateMoscow(iso);
}

export function ProfileView({
  profile,
  editHref = `${ROUTES.PROFILE}?edit=1`,
}: ProfileViewProps) {
  const displayName = profile.name?.trim() || "Покупатель";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="relative h-24 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent sm:h-28" />
      <div className="relative px-5 pb-6 sm:px-7">
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="relative size-24 overflow-hidden rounded-2xl bg-muted ring-4 ring-card sm:size-28">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="112px"
                  unoptimized
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-primary/15 font-heading text-3xl font-semibold text-primary">
                  {initial || <UserRound className="size-10" />}
                </div>
              )}
            </div>
            <div className="pb-1">
              <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                {displayName}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {profile.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={editHref} />}
          >
            <Pencil data-icon="inline-start" />
            Редактировать
          </Button>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <ProfileField
            icon={Mail}
            label="Email"
            value={profile.email}
          />
          <ProfileField
            icon={Phone}
            label="Телефон"
            value={profile.phone || "Не указан"}
            muted={!profile.phone}
          />
          <ProfileField
            icon={MapPin}
            label="Город"
            value={profile.city || "Не указан"}
            muted={!profile.city}
          />
          <ProfileField
            icon={CalendarDays}
            label="Дата регистрации"
            value={formatRegDate(profile.createdAt)}
          />
        </dl>
      </div>
    </div>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-surface/40 px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd
        className={
          muted
            ? "mt-1 text-sm text-muted-foreground"
            : "mt-1 text-sm font-medium text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
