"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/features/account/actions";
import type { UserProfile } from "@/features/account/types";
import { uploadImageFromClient } from "@/features/seller/lib/client-upload";
import { ROUTES } from "@/lib/constants";
import { UPLOAD_UNAVAILABLE_MESSAGE } from "@/lib/storage";
import { TOAST, toastError } from "@/lib/toasts";

type ProfileEditFormProps = {
  profile: UserProfile;
  onCancelHref?: string;
  onSavedHref?: string;
};

export function ProfileEditForm({
  profile,
  onCancelHref = ROUTES.PROFILE,
  onSavedHref = ROUTES.PROFILE,
}: ProfileEditFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleAvatarFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const metaRes = await fetch("/api/uploads");
      const meta = (await metaRes.json().catch(() => ({}))) as {
        configured?: boolean;
        avatarPathPrefix?: string | null;
      };
      if (meta.configured === false || !meta.avatarPathPrefix) {
        setError(UPLOAD_UNAVAILABLE_MESSAGE);
        return;
      }
      const result = await uploadImageFromClient(file, {
        pathPrefix: meta.avatarPathPrefix,
        purpose: "avatar",
      });
      setAvatarUrl(result.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить аватар",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    startTransition(() => {
      void (async () => {
        const result = await updateProfileAction({
          name,
          phone,
          city,
          avatarUrl,
        });
        if (!result.ok) {
          setError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          toastError(result.error);
          return;
        }
        toast.success(TOAST.SETTINGS_SAVED);
        router.push(onSavedHref);
        router.refresh();
      })();
    });
  }

  const displayName = name.trim() || profile.email;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-up space-y-6 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7"
    >
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative size-24 overflow-hidden rounded-2xl bg-muted ring-2 ring-border">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Аватар"
              fill
              className="object-cover"
              sizes="96px"
              unoptimized
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-primary/15 font-heading text-2xl font-semibold text-primary">
              {initial || <UserRound className="size-8" />}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Аватар</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || isPending}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload data-icon="inline-start" />
              )}
              Загрузить файл
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleAvatarFile(file);
                e.target.value = "";
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP или GIF — либо укажите URL ниже.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="avatarUrl">URL аватара</Label>
          <Input
            id="avatarUrl"
            name="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            aria-invalid={Boolean(fieldErrors.avatarUrl)}
          />
          {fieldErrors.avatarUrl?.[0] ? (
            <p className="text-xs text-destructive">{fieldErrors.avatarUrl[0]}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Имя</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как к вам обращаться"
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name?.[0] ? (
            <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Телефон</Label>
          <Input
            id="phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 …"
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          {fieldErrors.phone?.[0] ? (
            <p className="text-xs text-destructive">{fieldErrors.phone[0]}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="city">Город</Label>
          <Input
            id="city"
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Москва"
            aria-invalid={Boolean(fieldErrors.city)}
          />
          {fieldErrors.city?.[0] ? (
            <p className="text-xs text-destructive">{fieldErrors.city[0]}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-surface/40 px-4 py-3 text-sm text-muted-foreground">
        Email: <span className="font-medium text-foreground">{profile.email}</span>
        {" · "}
        нельзя изменить здесь
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending || uploading}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Сохранение…
            </>
          ) : (
            "Сохранить"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.push(onCancelHref)}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}
