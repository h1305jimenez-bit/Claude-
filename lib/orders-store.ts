import type { OrderDetails } from "./types";

/**
 * Simple in-memory store of recent orders, used by the `/admin/orders`
 * dashboard. This is intentionally minimal and has two caveats:
 *
 *  1. It lives in the Node.js process memory. On serverless platforms
 *     (Vercel, Netlify) each function invocation may start a fresh
 *     instance, so this store is best-effort — the reliable copy of
 *     every order is the email sent to OPERATOR_EMAIL.
 *  2. Restarting the dev server clears it.
 *
 * When you outgrow this, replace the underlying array with Vercel KV,
 * Upstash Redis or a proper Postgres table — the function signatures
 * below are all you need to swap.
 */

const MAX_ORDERS = 200;

// The `globalThis` trick keeps the array alive across hot-reloads in
// Next.js dev mode (which otherwise re-evaluates modules on every edit).
const g = globalThis as unknown as { __hecOrders?: OrderDetails[] };
if (!g.__hecOrders) g.__hecOrders = [];

export function saveOrder(order: OrderDetails): void {
  const list = g.__hecOrders!;
  // De-dupe: if the order id already exists, update in place.
  const idx = list.findIndex((o) => o.id === order.id);
  if (idx >= 0) list[idx] = order;
  else list.unshift(order);
  if (list.length > MAX_ORDERS) list.length = MAX_ORDERS;
}

export function listOrders(): OrderDetails[] {
  return [...(g.__hecOrders ?? [])];
}
