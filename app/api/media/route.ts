import { NextResponse } from "next/server";

import { isPrivateVercelBlobUrl } from "@/lib/storage/vercel-blob";

export const runtime = "nodejs";

/**
 * Proxy for private Vercel Blob objects (store access = private).
 * GET /api/media?url=<encoded private blob https url>
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url")?.trim();
  if (!raw || !isPrivateVercelBlobUrl(raw)) {
    return NextResponse.json({ error: "Некорректный URL" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "Хранилище не настроено" },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch(raw, {
      headers: { Authorization: `Bearer ${token}` },
      // Avoid caching private objects in shared CDN without auth.
      cache: "no-store",
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Не удалось получить файл" },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    const body = upstream.body;
    if (!body) {
      return NextResponse.json({ error: "Пустой ответ" }, { status: 502 });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[api/media]", err);
    return NextResponse.json({ error: "Ошибка прокси" }, { status: 502 });
  }
}
