import { z } from "zod";

export const cartProductIdSchema = z.object({
  productId: z.string().min(1, "Укажите товар"),
});

export const addToCartSchema = z.object({
  productId: z.string().min(1, "Укажите товар"),
  quantity: z.coerce.number().int().min(1).max(999).optional().default(1),
});

export const updateCartItemSchema = z.object({
  productId: z.string().min(1, "Укажите товар"),
  quantity: z.coerce.number().int().min(0).max(999),
});

export const guestCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(999),
});

export const mergeCartSchema = z.object({
  items: z.array(guestCartItemSchema).max(100),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;
