import { NextResponse } from "next/server";

import { markConversationMessagesRead } from "@/features/chat/queries";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { mobileChatErrorResponse, requireMobileChatViewer } from "@/lib/mobile/chat-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const auth = await requireMobileChatViewer(request);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  try {
    const result = await markConversationMessagesRead({
      conversationId: id,
      viewer: auth.viewer,
    });
    return NextResponse.json(withMobileApiContract(result, `read-${id}`));
  } catch (err) {
    return mobileChatErrorResponse(err);
  }
}
