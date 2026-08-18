import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

import { ok, err } from "./contracts/result";
import { InProcessDomainEventBus } from "./events/domain-event-bus";

const mobileRoot = join(__dirname, "..");

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (/\.(tsx?)$/.test(entry.name)) acc.push(p);
  }
  return acc;
}

test("Result helpers", () => {
  assert.equal(ok(1).ok, true);
  assert.equal(err({ code: "unknown", message: "x", retryable: false }).ok, false);
});

test("Domain event bus publishes to subscribers", () => {
  const bus = new InProcessDomainEventBus();
  let count = 0;
  const unsub = bus.subscribe("CartUpdated", () => {
    count += 1;
  });
  bus.publish({
    type: "CartUpdated",
    cart: {
      lines: [],
      itemCount: 0,
      subtotal: { amount: 0, currency: "RUB" },
      savings: { amount: 0, currency: "RUB" },
      updatedAt: new Date().toISOString(),
    },
  });
  unsub();
  assert.equal(count, 1);
});

test("architecture: design-system has no api imports", () => {
  const dsRoot = join(mobileRoot, "design-system");
  const violations: string[] = [];
  for (const file of walk(dsRoot)) {
    const source = readFileSync(file, "utf8");
    if (/from ['"][^'"]*api\//.test(source)) violations.push(relative(mobileRoot, file));
    if (/from ['"][^'"]*infrastructure\//.test(source)) violations.push(relative(mobileRoot, file));
  }
  assert.deepEqual(violations, []);
});

test("architecture: commerce app screens have no api imports", () => {
  const appRoot = join(mobileRoot, "app");
  const violations: string[] = [];
  for (const file of walk(appRoot)) {
    const source = readFileSync(file, "utf8");
    if (/from ['"][^'"]*api\/(endpoints|client)/.test(source)) violations.push(relative(mobileRoot, file));
  }
  assert.deepEqual(violations, []);
});

test("architecture: no DTO leaks outside api layer", () => {
  const violations: string[] = [];
  for (const file of walk(join(mobileRoot, "src"))) {
    if (file.includes("/api/")) continue;
    const source = readFileSync(file, "utf8");
    if (/MobileProductListItem|BootstrapPayload|RemoteConfigPayload/.test(source)) {
      violations.push(relative(mobileRoot, file));
    }
  }
  assert.deepEqual(violations, []);
});
