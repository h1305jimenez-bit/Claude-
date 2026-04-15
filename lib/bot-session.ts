import type { CartItem } from "./types";

/**
 * Per-phone conversation state for the WhatsApp bot.
 *
 * Same "best-effort, in-memory" pattern as `orders-store.ts`. On Vercel
 * each serverless invocation can start a fresh instance, so a session
 * that doesn't get a reply within a few minutes may lose its state.
 * For an MVP that's fine — the bot always tells the user where they
 * are and lets them restart with "menu".
 *
 * When you outgrow this, swap the `g.__botSessions` Map with Vercel KV
 * / Upstash / Redis. The API stays the same (get, set, clear).
 */

export type BotStep =
  | "start"
  | "ask_email"
  | "main_menu"
  | "groceries_store"
  | "groceries_category"
  | "groceries_product"
  | "groceries_qty"
  | "custom_text"
  | "custom_qty"
  | "laundry_service"
  | "laundry_kg"
  | "cart"
  | "ask_name"
  | "ask_building"
  | "ask_room"
  | "ask_slot"
  | "ask_notes"
  | "confirm"
  | "done";

export interface BotSession {
  phone: string;
  step: BotStep;
  email?: string;
  name?: string;
  building?: string;
  room?: string;
  slot?: string;
  notes?: string;
  cart: CartItem[];
  /** Temporary scratch values used across steps (selected product id, etc.). */
  temp: {
    storeId?: "jouy" | "saclay" | "both";
    categoryId?: string;
    productId?: string;
    customText?: string;
    laundryServiceId?: "wash" | "dry";
  };
  updatedAt: number;
}

const MAX_IDLE_MS = 60 * 60 * 1000; // 1 hour

const g = globalThis as unknown as { __botSessions?: Map<string, BotSession> };
if (!g.__botSessions) g.__botSessions = new Map();

export function getSession(phone: string): BotSession {
  const map = g.__botSessions!;
  const existing = map.get(phone);
  if (existing && Date.now() - existing.updatedAt < MAX_IDLE_MS) {
    return existing;
  }
  // Fresh session (or stale one — discard).
  const s: BotSession = {
    phone,
    step: "start",
    cart: [],
    temp: {},
    updatedAt: Date.now(),
  };
  map.set(phone, s);
  return s;
}

export function saveSession(s: BotSession) {
  s.updatedAt = Date.now();
  g.__botSessions!.set(s.phone, s);
}

export function clearSession(phone: string) {
  g.__botSessions!.delete(phone);
}

export function resetCart(s: BotSession) {
  s.cart = [];
  s.temp = {};
}
