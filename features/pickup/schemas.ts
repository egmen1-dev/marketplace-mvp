import { z } from "zod";

import { PREPAYMENT_PERCENTS } from "@/features/pickup/lib/prepayment";

export const pickupPointSchema = z.object({
  name: z.string().trim().min(2, "Укажите название").max(120),
  city: z.string().trim().min(2, "Укажите город").max(80),
  address: z.string().trim().min(3, "Укажите адрес").max(240),
  description: z.string().trim().max(500).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(32).optional().nullable().or(z.literal("")),
  workingHours: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

export type PickupPointInput = z.infer<typeof pickupPointSchema>;

export const prepaymentPercentSchema = z.coerce
  .number()
  .int()
  .refine(
    (n) => (PREPAYMENT_PERCENTS as readonly number[]).includes(n),
    "Допустимы: 0, 10, 20, 30, 50, 100",
  );
