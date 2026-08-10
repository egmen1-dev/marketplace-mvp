import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().cuid(),
  text: z
    .string()
    .trim()
    .min(1, "Введите сообщение")
    .max(4000, "Слишком длинное сообщение"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const startConversationSchema = z.object({
  productId: z.string().cuid(),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;
