import { router } from "expo-router";

import { createConversation } from "../api/endpoints";
import { refreshTabBadges } from "../commerce/refresh-tab-badges";
import { useAppStore } from "../store/app-store";

export async function startProductConversation(productId: string): Promise<string> {
  const { userRole } = useAppStore.getState();
  if (!userRole) {
    router.push("/login");
    throw new Error("AUTH_REQUIRED");
  }
  const result = await createConversation(productId);
  void refreshTabBadges();
  return result.conversationId;
}

export async function openProductConversation(productId: string) {
  const conversationId = await startProductConversation(productId);
  router.push(`/messages/${conversationId}`);
}

export async function openSellerConversationFromProduct(productId: string) {
  return openProductConversation(productId);
}

export async function openSellerConversationFromStorefront(products: Array<{ id: string }>) {
  const first = products[0];
  if (!first) throw new Error("NO_PRODUCT");
  return openProductConversation(first.id);
}
