import { z } from "zod";

const optionalTrimmed = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .or(z.literal(""));

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Имя слишком короткое")
    .max(80, "Имя слишком длинное")
    .optional()
    .or(z.literal("")),
  phone: optionalTrimmed(32, "Телефон слишком длинный").refine(
    (v) => !v || /^[+0-9()\-\s]{5,32}$/.test(v),
    "Введите корректный телефон",
  ),
  city: optionalTrimmed(80, "Город слишком длинный"),
  avatarUrl: z
    .string()
    .trim()
    .max(2048, "URL слишком длинный")
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || /^https?:\/\//i.test(v),
      "Укажите URL вида https://…",
    ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
