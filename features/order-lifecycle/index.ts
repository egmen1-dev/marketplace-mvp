import {
  OrderActorRole,
  OrderEventType,
  OrderFulfillmentType,
  OrderStatus,
  PickupReservationStatus,
  Prisma,
  UserRole,
} from "@prisma/client";

import {
  afterTransitionSideEffects,
  OrderLifecycleError,
  recordOrderCreated,
  transitionOrder,
  transitionOrderInTx,
  transitionOrderWithEffects,
} from "@/features/order-lifecycle/lib/transition";
import {
  canTransition,
  getAllowedTransitions,
  getExpectedNextAction,
  normalizeOrderStatus,
  userRoleToActorRole,
} from "@/features/order-lifecycle/lib/state-machine";
import {
  buildSlaAfterPayment,
  isConfirmationOverdue,
  isShipmentOverdue,
} from "@/features/order-lifecycle/lib/sla";
import {
  publishOrderLifecycleEvent,
  subscribeOrderLifecycle,
} from "@/features/order-lifecycle/lib/event-bus";
import { eventTypeForStatus } from "@/features/order-lifecycle/lib/events";
import {
  COMPLETED_ORDER_STATUSES,
  countCompletedOrdersForSeller,
  getOrderLifecycleAnalytics,
  isOrderReviewEligible,
} from "@/features/order-lifecycle/lib/integrations";

export {
  OrderLifecycleError,
  transitionOrder,
  transitionOrderInTx,
  transitionOrderWithEffects,
  afterTransitionSideEffects,
  recordOrderCreated,
  canTransition,
  getAllowedTransitions,
  getExpectedNextAction,
  normalizeOrderStatus,
  userRoleToActorRole,
  buildSlaAfterPayment,
  isConfirmationOverdue,
  isShipmentOverdue,
  publishOrderLifecycleEvent,
  subscribeOrderLifecycle,
  eventTypeForStatus,
  COMPLETED_ORDER_STATUSES,
  countCompletedOrdersForSeller,
  getOrderLifecycleAnalytics,
  isOrderReviewEligible,
  OrderActorRole,
  OrderEventType,
  OrderFulfillmentType,
  OrderStatus,
  PickupReservationStatus,
  Prisma,
  UserRole,
};
