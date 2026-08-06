"use server";

/**
 * Product server actions.
 * Mutations live in features/seller (form UX); re-exported here for discoverability.
 */

export {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  type CreateProductActionState,
  type UpdateProductActionState,
  type DeleteProductActionState,
  type ProductActionState,
} from "@/features/seller/actions";
