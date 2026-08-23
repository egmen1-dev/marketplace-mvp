import { NextResponse } from "next/server";

import {
  countUnreadMessagesForUser,
  getOrCreateConversationForProduct,
  listConversationsForUser,
} from "@/features/chat/queries";
import { startConversationSchema } from "@/features/chat/schemas";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { mobileChatErrorResponse, requireMobileChatViewer } from "@/lib/mobile/chat-errors";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const auth = await requireMobileChatViewer(request);
  if ("error" in auth) return auth.error;

  try {
    const items = await listConversationsForUser({ userId: auth.viewer.id });
    const unreadTotal = await countUnreadMessagesForUser({ userId: auth.viewer.id });
    return NextResponse.json(
      withMobileApiContract({ items, unreadTotal }, `conversations-${auth.viewer.id}`),
    );
  } catch (err) {
    return mobileChatErrorResponse(err);
  }
}

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const auth = await requireMobileChatViewer(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const parsed = startConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "productId required", retryable: false } },
      { status: 400 },
    );
  }

  try {
    const result = await getOrCreateConversationForProduct({
      productId: parsed.data.productId,
      buyerId: auth.viewer.id,
    });
    return NextResponse.json(
      withMobileApiContract(
        { conversationId: result.conversationId, created: result.created },
        `${auth.viewer.id}:${parsed.data.productId}`,
      ),
    );
  } catch (err) {
    return mobileChatErrorResponse(err);
  }
}
