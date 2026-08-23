import { NextResponse } from "next/server";

import { ChatError } from "@/features/chat/queries";

export function mobileChatErrorResponse(err: unknown) {
  if (err instanceof ChatError) {
    const status =
      err.code === "NOT_FOUND" ? 404 : err.code === "FORBIDDEN" ? 403 : err.code === "CLOSED" ? 409 : 400;
    return NextResponse.json(
      { error: { code: err.code, message: err.message, retryable: false } },
      { status },
    );
  }
  console.error("[mobile chat]", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Не удалось выполнить запрос", retryable: true } },
    { status: 500 },
  );
}

export async function requireMobileChatViewer(request: Request) {
  const { resolveRequestUser } = await import("@/features/auth/resolve-request-user");
  const user = await resolveRequestUser(request);
  if (!user) {
    return {
      error: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Login required", retryable: false } },
        { status: 401 },
      ),
    };
  }
  return {
    viewer: {
      id: user.id,
      role: user.role,
      sellerProfileId: user.sellerProfileId,
    },
  };
}
