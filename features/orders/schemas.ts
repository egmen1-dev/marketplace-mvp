import { z } from "zod";

const deliveryMethodSchema = z.enum(["PICKUP", "COURIER"]);
const fulfillmentTypeSchema = z.enum(["DELIVERY", "SELLER_PICKUP"]);

export const checkoutFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Укажите имя")
      .max(120, "Слишком длинное имя"),
    phone: z
      .string()
      .trim()
      .max(32, "Слишком длинный телефон")
      .optional()
      .or(z.literal("")),
    city: z
      .string()
      .trim()
      .min(2, "Укажите город")
      .max(80, "Слишком длинное название города"),
    street: z
      .string()
      .trim()
      .max(200, "Слишком длинный адрес")
      .optional()
      .or(z.literal("")),
    notes: z
      .string()
      .trim()
      .max(500, "Слишком длинный комментарий")
      .optional()
      .or(z.literal("")),
    /** Top-level: CDEK delivery vs seller warehouse pickup */
    fulfillmentType: fulfillmentTypeSchema.default("DELIVERY"),
    /** CDEK method when fulfillmentType = DELIVERY */
    deliveryMethod: deliveryMethodSchema.optional().default("PICKUP"),
    /** CDEK PVZ code */
    pickupPointId: z
      .string()
      .trim()
      .max(64)
      .optional()
      .or(z.literal("")),
    pickupAddress: z
      .string()
      .trim()
      .max(300)
      .optional()
      .or(z.literal("")),
    /** Seller PickupPoint.id when fulfillmentType = SELLER_PICKUP */
    sellerPickupPointId: z
      .string()
      .trim()
      .max(64)
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentType === "SELLER_PICKUP") {
      const pointId = data.sellerPickupPointId?.trim() ?? "";
      if (!pointId) {
        ctx.addIssue({
          code: "custom",
          path: ["sellerPickupPointId"],
          message: "Выберите точку самовывоза продавца",
        });
      }
      return;
    }

    const method = data.deliveryMethod ?? "PICKUP";
    if (method === "COURIER") {
      const street = data.street?.trim() ?? "";
      if (street.length < 3) {
        ctx.addIssue({
          code: "custom",
          path: ["street"],
          message: "Укажите адрес для курьерской доставки",
        });
      }
    }
    if (method === "PICKUP") {
      const pointId = data.pickupPointId?.trim() ?? "";
      if (!pointId) {
        ctx.addIssue({
          code: "custom",
          path: ["pickupPointId"],
          message: "Выберите пункт выдачи СДЭК",
        });
      }
    }
  });

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
export type DeliveryMethodInput = z.infer<typeof deliveryMethodSchema>;
export type FulfillmentTypeInput = z.infer<typeof fulfillmentTypeSchema>;
