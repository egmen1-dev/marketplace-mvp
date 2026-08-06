/**
 * Shared TypeScript types for the marketplace.
 * Prefer Prisma-generated types for DB entities; use these for DTOs / UI.
 */

export type {
  User,
  SellerProfile,
  Category,
  Product,
  ProductImage,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Payment,
  Address,
  Delivery,
  UserRole,
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  DeliveryProvider,
  DeliveryMethod,
  DeliveryStatus,
  AddressType,
} from "@prisma/client";

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SortDirection = "asc" | "desc";
