import { NextResponse } from "next/server";

import { getConversationDetail } from "@/features/chat/queries";
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
  if (!id) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "conversationId required", retryable: false } },
      { status: 400 },
    );
  }

  try {
    const detail = await getConversationDetail({
      conversationId: id,
      viewer: auth.viewer,
    });
    return NextResponse.json(withMobileApiContract(detail, `conversation-${id}`));
  } catch (err) {
    return mobileChatErrorResponse(err);
  }
}
