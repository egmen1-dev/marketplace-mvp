"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadImageFromClient } from "@/features/seller/lib/client-upload";
import {
  PRODUCT_IMAGE_LIMITS,
  PRODUCT_IMAGE_TOO_LARGE_MESSAGE,
  UPLOAD_UNAVAILABLE_MESSAGE,
} from "@/lib/storage/types";
import { cn } from "@/lib/utils";

function sanitizeUploadError(message: string | undefined, status?: number): string {
  const raw = (message ?? "").trim();
  if (status === 413 || /413|entity too large|too large/i.test(raw)) {
    return PRODUCT_IMAGE_TOO_LARGE_MESSAGE;
  }
  if (
    !raw ||
    /BLOB_|stack|at\s+\S+\s+\(|process\.env|ECONNREFUSED|ENOTFOUND/i.test(raw)
  ) {
    if (status === 503) return UPLOAD_UNAVAILABLE_MESSAGE;
    return "Не удалось загрузить изображение";
  }
  return raw;
}

export type UploaderImage = {
  id: string;
  url: string;
  /** Uploaded in this session — safe to delete from Blob on remove */
  isNew?: boolean;
};

type ProductImageUploaderProps = {
  name?: string;
  initialUrls?: string[];
  error?: string;
  disabled?: boolean;
};

const ACCEPT = PRODUCT_IMAGE_LIMITS.mimeTypes.join(",");
const MAX_MB = PRODUCT_IMAGE_LIMITS.maxBytes / (1024 * 1024);

function clientValidate(file: File): string | null {
  if (file.size > PRODUCT_IMAGE_LIMITS.maxBytes) {
    return PRODUCT_IMAGE_TOO_LARGE_MESSAGE;
  }
  const ext = /\.[a-zA-Z0-9]+$/.exec(file.name)?.[0]?.toLowerCase();
  const allowedExt = PRODUCT_IMAGE_LIMITS.extensions as readonly string[];
  if (!ext || !allowedExt.includes(ext)) {
    return `«${file.name}»: только JPEG, PNG, WebP, GIF`;
  }
  if (
    file.type &&
    !(PRODUCT_IMAGE_LIMITS.mimeTypes as readonly string[]).includes(file.type) &&
    file.type !== "image/jpg"
  ) {
    return `«${file.name}»: недопустимый тип файла`;
  }
  return null;
}

function SortableThumb({
  item,
  index,
  onRemove,
  disabled,
}: {
  item: UploaderImage;
  index: number;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-elevated",
        isDragging && "z-10 opacity-40 ring-2 ring-primary",
      )}
    >
      <Image
        src={item.url}
        alt={`Фото ${index + 1}`}
        fill
        unoptimized
        className="object-cover"
        sizes="120px"
      />
      {index === 0 ? (
        <span className="absolute top-1.5 left-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-glow">
          Главное
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md bg-background/70 text-foreground backdrop-blur-sm hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          aria-label="Перетащить"
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md bg-background/70 text-foreground backdrop-blur-sm hover:bg-destructive hover:text-white disabled:opacity-40"
          aria-label="Удалить фото"
          disabled={disabled}
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

export function ProductImageUploader({
  name = "images",
  initialUrls = [],
  error,
  disabled,
}: ProductImageUploaderProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploaderImage[]>(() =>
    initialUrls.map((url, i) => ({
      id: `existing-${i}-${url.slice(-24)}`,
      url,
      isNew: false,
    })),
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [uploadAvailable, setUploadAvailable] = useState<boolean | null>(null);
  const [productPathPrefix, setProductPathPrefix] = useState<string | null>(
    null,
  );
  const [isOver, setIsOver] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const remaining = PRODUCT_IMAGE_LIMITS.maxCount - items.length;
  const uploadsDisabled =
    disabled || uploading || remaining <= 0 || uploadAvailable === false;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/uploads");
        const data = (await res.json().catch(() => ({}))) as {
          configured?: boolean;
          productPathPrefix?: string | null;
        };
        if (!cancelled) {
          const configured = data.configured !== false;
          const prefix =
            typeof data.productPathPrefix === "string" &&
            data.productPathPrefix.length > 0
              ? data.productPathPrefix
              : null;
          setProductPathPrefix(prefix);
          setUploadAvailable(configured && Boolean(prefix));
          if (!configured || !prefix) {
            setLocalError(UPLOAD_UNAVAILABLE_MESSAGE);
          }
        }
      } catch {
        if (!cancelled) {
          // Unknown — allow attempt; upload helper will surface a friendly error.
          setUploadAvailable(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const removeItem = useCallback(async (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.isNew) {
        void fetch(`/api/uploads?url=${encodeURIComponent(target.url)}`, {
          method: "DELETE",
        }).catch(() => {
          /* best-effort cleanup */
        });
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      if (uploadAvailable === false || !productPathPrefix) {
        setLocalError(UPLOAD_UNAVAILABLE_MESSAGE);
        return;
      }

      setLocalError(null);

      if (list.length > remaining) {
        setLocalError(
          `Можно добавить ещё ${remaining} из ${PRODUCT_IMAGE_LIMITS.maxCount} фото`,
        );
        return;
      }

      const valid: File[] = [];
      for (const file of list) {
        const err = clientValidate(file);
        if (err) {
          setLocalError(err);
          return;
        }
        valid.push(file);
      }

      setUploading(true);
      setProgress({ done: 0, total: valid.length });

      const uploaded: UploaderImage[] = [];
      try {
        for (let i = 0; i < valid.length; i++) {
          const file = valid[i]!;
          try {
            const result = await uploadImageFromClient(file, {
              pathPrefix: productPathPrefix,
              purpose: "product",
            });
            uploaded.push({
              id: `new-${crypto.randomUUID()}`,
              url: result.url,
              isNew: true,
            });
            setProgress({ done: i + 1, total: valid.length });
          } catch (err) {
            const message =
              err instanceof Error
                ? sanitizeUploadError(err.message)
                : "Не удалось загрузить изображение";
            if (message === UPLOAD_UNAVAILABLE_MESSAGE) {
              setUploadAvailable(false);
            }
            throw new Error(message);
          }
        }
        setItems((prev) => [...prev, ...uploaded]);
      } catch (err) {
        for (const img of uploaded) {
          void fetch(`/api/uploads?url=${encodeURIComponent(img.url)}`, {
            method: "DELETE",
          }).catch(() => undefined);
        }
        setLocalError(
          err instanceof Error
            ? sanitizeUploadError(err.message)
            : "Не удалось загрузить файлы",
        );
      } finally {
        setUploading(false);
        setProgress(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [remaining, uploadAvailable, productPathPrefix],
  );

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      void uploadFiles(e.target.files);
    }
  };

  const onDrop = (e: ReactDragEvent) => {
    e.preventDefault();
    setIsOver(false);
    if (uploadsDisabled) return;
    if (e.dataTransfer.files?.length) {
      void uploadFiles(e.dataTransfer.files);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const activeItem = activeId
    ? items.find((i) => i.id === activeId)
    : undefined;

  const hiddenValue = items.map((i) => i.url).join("\n");
  const displayError = error ?? localError;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <Label htmlFor={inputId}>Фотографии</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            До {PRODUCT_IMAGE_LIMITS.maxCount} фото · JPEG, PNG, WebP, GIF · до{" "}
            {MAX_MB} МБ. Первое — обложка. Перетащите, чтобы изменить порядок.
          </p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {items.length}/{PRODUCT_IMAGE_LIMITS.maxCount}
        </span>
      </div>

      <input type="hidden" name={name} value={hiddenValue} />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!uploadsDisabled) {
              fileRef.current?.click();
            }
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={onDrop}
        onClick={() => {
          if (!uploadsDisabled) {
            fileRef.current?.click();
          }
        }}
        className={cn(
          "relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-[border-color,background,box-shadow] duration-[var(--duration-base)]",
          isOver
            ? "border-primary bg-primary/10 shadow-glow"
            : "border-border bg-surface hover:border-primary/50 hover:bg-surface-elevated",
          uploadsDisabled && "pointer-events-none opacity-60",
        )}
        data-testid="product-image-dropzone"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
          {uploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ImagePlus className="size-5" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {uploading
              ? `Загрузка ${progress?.done ?? 0}/${progress?.total ?? 0}…`
              : uploadAvailable === false
                ? UPLOAD_UNAVAILABLE_MESSAGE
                : remaining <= 0
                  ? "Достигнут лимит фото"
                  : "Перетащите фото сюда или нажмите"}
          </p>
          <p className="text-xs text-muted-foreground">
            {uploadAvailable === false
              ? "Можно сохранить товар без фото — будет показана заглушка"
              : "Можно выбрать несколько файлов сразу"}
          </p>
        </div>
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          data-testid="product-image-input"
          disabled={uploadsDisabled}
          onChange={onFileChange}
        />
      </div>

      {items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {items.map((item, index) => (
                <SortableThumb
                  key={item.id}
                  item={item}
                  index={index}
                  onRemove={removeItem}
                  disabled={disabled || uploading}
                />
              ))}
            </ul>
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              <div className="relative aspect-square w-24 overflow-hidden rounded-xl border-2 border-primary shadow-card-hover">
                <Image
                  src={activeItem.url}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : null}

      {items.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={disabled || uploading}
            onClick={() => {
              for (const item of items) {
                if (item.isNew) {
                  void fetch(
                    `/api/uploads?url=${encodeURIComponent(item.url)}`,
                    { method: "DELETE" },
                  ).catch(() => undefined);
                }
              }
              setItems([]);
              setLocalError(null);
            }}
          >
            <X className="size-3.5" />
            Очистить все
          </Button>
        </div>
      ) : null}

      {displayError ? (
        <p
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          data-testid="product-image-error"
          role="alert"
        >
          {displayError}
        </p>
      ) : null}
    </div>
  );
}
