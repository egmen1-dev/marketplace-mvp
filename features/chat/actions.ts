"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AuthRequiredError,
  getSessionUser,
  loadUserAuthFromDb,
} from "@/features/auth";
import {
  ChatError,
  adminDeleteConversation,
  getOrCreateConversationForProduct,
  sendTextMessage,
} from "@/features/chat/queries";
import {
  sendMessageSchema,
  startConversationSchema,
} from "@/features/chat/schemas";
import { ROUTES, conversationPath } from "@/lib/constants";

export type ChatActionState = {
  ok: boolean;
  error?: string;
};

async function requireChatViewer() {
  const session = await getSessionUser();
  if (!session) throw new AuthRequiredError();
  const dbUser = await loadUserAuthFromDb(session.id);
  if (!dbUser) throw new AuthRequiredError();
  return {
    id: dbUser.id,
    role: dbUser.role,
    sellerProfileId: dbUser.sellerProfileId,
  };
}

export async function startConversationAction(
  productId: string,
): Promise<ChatActionState | void> {
  try {
    const viewer = await requireChatViewer();
    const parsed = startConversationSchema.safeParse({ productId });
    if (!parsed.success) {
      return { ok: false, error: "Некорректный товар" };
    }
    const { conversationId } = await getOrCreateConversationForProduct({
      productId: parsed.data.productId,
      buyerId: viewer.id,
    });
    revalidatePath(ROUTES.ACCOUNT_MESSAGES);
    redirect(conversationPath(conversationId));
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      redirect(
        `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(`${ROUTES.PRODUCT}/${productId}?writeSeller=1`)}`,
      );
    }
    if (err && typeof err === "object" && "digest" in err) throw err;
    if (err instanceof ChatError) {
      return { ok: false, error: err.message };
    }
    console.error("[startConversationAction]", err);
    return { ok: false, error: "Не удалось открыть диалог" };
  }
}

export async function sendMessageAction(
  _prev: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  try {
    const viewer = await requireChatViewer();
    const parsed = sendMessageSchema.safeParse({
      conversationId: formData.get("conversationId"),
      text: formData.get("text"),
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Проверьте сообщение",
      };
    }
    await sendTextMessage({
      conversationId: parsed.data.conversationId,
      senderId: viewer.id,
      text: parsed.data.text,
      viewer,
    });
    revalidatePath(conversationPath(parsed.data.conversationId));
    revalidatePath(ROUTES.ACCOUNT_MESSAGES);
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return { ok: false, error: "Требуется вход" };
    }
    if (err instanceof ChatError) {
      return { ok: false, error: err.message };
    }
    console.error("[sendMessageAction]", err);
    return { ok: false, error: "Не удалось отправить" };
  }
}

export async function adminDeleteConversationAction(
  conversationId: string,
): Promise<ChatActionState> {
  try {
    const viewer = await requireChatViewer();
    if (viewer.role !== "ADMIN") {
      return { ok: false, error: "Недостаточно прав" };
    }
    await adminDeleteConversation(conversationId);
    revalidatePath(ROUTES.ACCOUNT_MESSAGES);
    return { ok: true };
  } catch (err) {
    console.error("[adminDeleteConversationAction]", err);
    return { ok: false, error: "Не удалось закрыть диалог" };
  }
}
