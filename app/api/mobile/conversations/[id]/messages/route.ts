import { NextResponse } from "next/server";

import { listMessagesPaginated, sendTextMessage } from "@/features/chat/queries";
import { sendMessageSchema } from "@/features/chat/schemas";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { mobileChatErrorResponse, requireMobileChatViewer } from "@/lib/mobile/chat-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const auth = await requireMobileChatViewer(request);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  try {
    const page = await listMessagesPaginated({
      conversationId: id,
      viewer: auth.viewer,
      cursor,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json(withMobileApiContract(page, `messages-${id}`));
  } catch (err) {
    return mobileChatErrorResponse(err);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const auth = await requireMobileChatViewer(request);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const parsed = sendMessageSchema.safeParse({ conversationId: id, text: body.body ?? body.text });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid message",
          retryable: false,
        },
      },
      { status: 400 },
    );
  }

  try {
    const message = await sendTextMessage({
      conversationId: parsed.data.conversationId,
      senderId: auth.viewer.id,
      text: parsed.data.text,
      viewer: auth.viewer,
    });
    return NextResponse.json(withMobileApiContract({ message }, `message-${message.id}`));
  } catch (err) {
    return mobileChatErrorResponse(err);
  }
}
