/**
 * EPIC 92 — Domain contracts public surface.
 * Import from here in features/ — never from infrastructure/ or api/.
 */

export * from "./errors";
export * from "./result";
export * from "./events";

export * from "./entities/catalog";
export * from "./entities/cart";
export * from "./entities/checkout";
export * from "./entities/order";
export * from "./entities/session";
export * from "./entities/seller";
export * from "./entities/wallet";
export * from "./entities/profile";

export * from "./value-objects/ids";
export * from "./value-objects/money";
export * from "./value-objects/policies";

export * from "./repositories/index";
export * from "./use-cases/index";

export const DOMAIN_CONTRACTS_VERSION = "1.0.0" as const;
