import { UserRole } from "@prisma/client";
import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Введите корректный email")
    .toLowerCase(),
  password: z.string().min(1, "Введите пароль"),
  callbackUrl: z.string().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Введите корректный email")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Пароль не короче 8 символов")
    .max(72, "Пароль слишком длинный"),
  name: z
    .string()
    .trim()
    .min(2, "Имя слишком короткое")
    .max(80, "Имя слишком длинное")
    .optional()
    .or(z.literal("")),
  role: z
    .enum([UserRole.BUYER, UserRole.SELLER])
    .default(UserRole.BUYER),
  storeName: z
    .string()
    .trim()
    .min(2, "Название магазина слишком короткое")
    .max(80, "Название магазина слишком длинное")
    .optional()
    .or(z.literal("")),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
