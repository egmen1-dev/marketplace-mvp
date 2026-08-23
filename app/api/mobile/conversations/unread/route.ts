import { NextResponse } from "next/server";

import { countUnreadMessagesForUser } from "@/features/chat/queries";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { mobileChatErrorResponse, requireMobileChatViewer } from "@/lib/mobile/chat-errors";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const auth = await requireMobileChatViewer(request);
  if ("error" in auth) return auth.error;

  try {
    const unreadTotal = await countUnreadMessagesForUser({ userId: auth.viewer.id });
    return NextResponse.json(
      withMobileApiContract({ unreadTotal }, `unread-${auth.viewer.id}`),
    );
  } catch (err) {
    return mobileChatErrorResponse(err);
  }
}
