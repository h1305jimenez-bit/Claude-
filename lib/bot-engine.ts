/**
 * lib/bot-engine.ts
 *
 * Conversational state machine for the HEC Campus Delivery WhatsApp bot.
 *
 * Entry point: handleIncoming({ from, messageId, text, buttonId, listId })
 *
 * Flow overview
 * ─────────────
 * start / any reset keyword
 *   └─► main_menu  [3 buttons: Groceries / Laundry / Custom]
 *         ├─► groceries_store  (Jouy / Saclay buttons)
 *         │     └─► groceries_category  (list, paginated)
 *         │           └─► groceries_product  (list, paginated ≤10/page)
 *         │                 └─► groceries_qty  (free text)
 *         │                       └─► cart ──────────────────────────────┐
 *         ├─► laundry_service  (Wash / Dry buttons)                      │
 *         │     └─► laundry_kg  (free text)                              │
 *         │           └─► cart ────────────────────────────────────────┐ │
 *         └─► custom_text  (free text description)                     │ │
 *               └─► custom_qty  (free text)                            │ │
 *                     └─► cart ──────────────────────────────────────┐ │ │
 *                                                                     ▼ ▼ ▼
 *                                                          cart  [Checkout / Add more / Clear]
 *                                                            └─► ask_email → ask_name → ask_building
 *                                                                  → ask_room → ask_slot → ask_notes
 *                                                                  → confirm  [Confirm / Cancel]
 *                                                                  → done  (sends Revolut link)
 *
 * Reset keywords ("menu", "hola", "start", "reset", "hi", "hello") work from
 * any step and always return the user to the main menu with a fresh session.
 */

import { getSession, saveSession, resetCart, type BotSession } from "./bot-session";
import { sendText, sendButtons, sendList, type BotListRow } from "./whatsapp-bot";
import { PRODUCTS, CATEGORIES } from "./products";
import { LAUNDRY_SERVICES, PICKUP_SLOTS } from "./laundry";
import { saveOrder } from "./orders-store";
import { sendOrderConfirmationEmail, sendOperatorOrderEmail } from "./email";
import { notifyOperator } from "./whatsapp";
import { buildRevolutPayLink } from "./revolut";
import type { CartItem, OrderDetails } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_FEE_EUR = 2.5;

/** Maximum products per list page (Meta hard-limits list to 10 rows). */
const PRODUCT_PAGE_SIZE = 9; // 9 items + 1 "Ver más →" row = 10 max

/** Maximum categories per list page. */
const CATEGORY_PAGE_SIZE = 9; // 9 categories + 1 "See more →" = 10 max

const RESET_RE = /^(menu|hola|start|reset|hi|hello)$/i;

// ─── Public API ───────────────────────────────────────────────────────────────

export interface IncomingMessage {
  from: string;
  messageId: string;
  text?: string;
  /** id of a tapped reply-button (interactive.button_reply.id) */
  buttonId?: string;
  /** id of a selected list row (interactive.list_reply.id) */
  listId?: string;
}

/**
 * Main entry point.  Called by the webhook handler for every inbound message.
 * Never throws — errors are logged and a friendly fallback is sent.
 */
export async function handleIncoming(msg: IncomingMessage): Promise<void> {
  try {
    await _dispatch(msg);
  } catch (err) {
    console.error("[bot-engine] Unhandled error:", err);
    try {
      await sendText(
        msg.from,
        "⚠️ Something went wrong on our end. Type *menu* to restart.",
      );
    } catch {
      // ignore secondary send error
    }
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Resolve the effective text input regardless of message type. */
function normalise(msg: IncomingMessage): string {
  return (msg.buttonId ?? msg.listId ?? msg.text ?? "").trim();
}

function cartSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, i) => sum + i.priceEUR * i.quantity, 0);
}

function cartTotal(cart: CartItem[]): number {
  return cartSubtotal(cart) + SERVICE_FEE_EUR;
}

function detectOrderKind(
  cart: CartItem[],
): "auchan" | "laundry" | "mixed" {
  const hasProduct = cart.some((i) => i.kind === "product" || i.kind === "custom");
  const hasLaundry = cart.some((i) => i.kind === "laundry");
  if (hasProduct && hasLaundry) return "mixed";
  if (hasLaundry) return "laundry";
  return "auchan";
}

function cartSummaryText(cart: CartItem[]): string {
  if (cart.length === 0) return "_Your cart is empty._";
  const lines = cart.map((i) => {
    const priceLabel =
      i.priceEUR > 0
        ? ` — ${(i.priceEUR * i.quantity).toFixed(2)} €`
        : " — TBD";
    return `${i.emoji} ${i.name} ×${i.quantity}${priceLabel}`;
  });
  const sub = cartSubtotal(cart);
  lines.push("");
  lines.push(`Subtotal: ${sub.toFixed(2)} €`);
  lines.push(`Service fee: ${SERVICE_FEE_EUR.toFixed(2)} €`);
  lines.push(`*Total: ${cartTotal(cart).toFixed(2)} €*`);
  return lines.join("\n");
}

// ─── Outbound message builders ────────────────────────────────────────────────

async function sendWelcome(to: string): Promise<void> {
  await sendText(to, "👋 Welcome to *HEC Campus Delivery*!\n\nOrder Auchan groceries, laundry service or anything custom — delivered to your room.");
}

async function sendMainMenu(to: string): Promise<void> {
  await sendButtons(
    to,
    "What can I get for you today?",
    [
      { id: "menu_groceries", title: "🛒 Groceries" },
      { id: "menu_laundry",   title: "🧺 Laundry" },
      { id: "menu_custom",    title: "📝 Custom" },
    ],
    { header: "HEC Campus Delivery" },
  );
}

async function sendStoreMenu(to: string): Promise<void> {
  await sendButtons(
    to,
    "Which Auchan store would you like to order from?",
    [
      { id: "store_jouy",   title: "Jouy-en-Josas" },
      { id: "store_saclay", title: "Saclay" },
    ],
    { header: "🛒 Choose store", footer: "Saclay has a wider selection" },
  );
}

async function sendCategoryList(to: string, page: number): Promise<void> {
  const start = page * CATEGORY_PAGE_SIZE;
  const slice = CATEGORIES.slice(start, start + CATEGORY_PAGE_SIZE);
  const rows = slice.map((c) => ({
    id: `cat_${c.id}`,
    title: `${c.emoji} ${c.label}`.slice(0, 24),
  }));
  const hasMore = start + CATEGORY_PAGE_SIZE < CATEGORIES.length;
  if (hasMore) {
    rows.push({ id: `catpage_${page + 1}`, title: "See more →" });
  }
  await sendList(
    to,
    "Choose a category:",
    "Browse categories",
    [{ title: "Categories", rows }],
  );
}

async function sendProductList(
  to: string,
  session: BotSession,
  page: number,
): Promise<void> {
  const storeId = session.temp.storeId ?? "both";
  const catId   = session.temp.categoryId;
  const all = PRODUCTS.filter(
    (p) =>
      p.category === catId &&
      (storeId === "both" || p.store === storeId || p.store === "both"),
  );

  if (all.length === 0) {
    await sendText(
      to,
      "No products found for this category in this store.\nLet's pick a different one:",
    );
    await sendCategoryList(to, 0);
    return;
  }

  const start = page * PRODUCT_PAGE_SIZE;
  const slice = all.slice(start, start + PRODUCT_PAGE_SIZE);
  const rows: BotListRow[] = slice.map((p) => ({
    id: `prod_${p.id}`,
    title: `${p.emoji} ${p.name}`.slice(0, 24),
    description: `${p.priceEUR.toFixed(2)} € / ${p.unit}`.slice(0, 72),
  }));
  const hasMore = start + PRODUCT_PAGE_SIZE < all.length;
  if (hasMore) {
    rows.push({ id: `prodpage_${page + 1}`, title: "Ver más →" });
  }

  await sendList(
    to,
    "Choose a product:",
    "Browse products",
    [{ title: "Products", rows }],
  );
}

async function sendLaundryMenu(to: string): Promise<void> {
  await sendButtons(
    to,
    "Choose a laundry service:",
    LAUNDRY_SERVICES.map((s) => ({
      id: `laundry_${s.id}`,
      title: `${s.emoji} ${s.name}`.slice(0, 20),
    })),
    {
      header: "🧺 Laundry service",
      footer: `Wash ${LAUNDRY_SERVICES.find((s) => s.id === "wash")!.priceEUR}€/kg · Dry ${LAUNDRY_SERVICES.find((s) => s.id === "dry")!.priceEUR}€/kg`,
    },
  );
}

async function sendCartView(to: string, session: BotSession): Promise<void> {
  await sendButtons(
    to,
    `🛒 *Your cart*\n\n${cartSummaryText(session.cart)}`,
    [
      { id: "cart_checkout", title: "✅ Checkout" },
      { id: "cart_add",      title: "➕ Add more" },
      { id: "cart_clear",    title: "🗑 Clear cart" },
    ],
  );
}

async function sendSlotList(to: string): Promise<void> {
  await sendList(
    to,
    "Choose your delivery / pickup slot:",
    "Choose slot",
    [
      {
        title: "Available slots",
        rows: PICKUP_SLOTS.map((slot, i) => ({
          id: `slot_${i}`,
          title: slot.slice(0, 24),
        })),
      },
    ],
  );
}

async function sendOrderSummary(to: string, session: BotSession): Promise<void> {
  const sub   = cartSubtotal(session.cart);
  const total = cartTotal(session.cart);

  const itemLines = session.cart.map(
    (i) =>
      `${i.emoji} ${i.name} ×${i.quantity}` +
      (i.priceEUR > 0 ? ` — ${(i.priceEUR * i.quantity).toFixed(2)} €` : " — TBD"),
  );

  const summary = [
    "📋 *Order summary*",
    "",
    ...itemLines,
    "",
    `Subtotal: ${sub.toFixed(2)} €`,
    `Service fee: ${SERVICE_FEE_EUR.toFixed(2)} €`,
    `*Total: ${total.toFixed(2)} €*`,
    "",
    `👤 ${session.name}`,
    `📧 ${session.email}`,
    `🏠 Bldg ${session.building} · Room ${session.room}`,
    `⏰ ${session.slot}`,
    ...(session.notes ? [`📝 ${session.notes}`] : []),
  ].join("\n");

  // Send full summary as plain text first (no 1 024-char cap)
  await sendText(to, summary);

  // Then the action buttons
  await sendButtons(
    to,
    "Ready to place your order?",
    [
      { id: "confirm_yes", title: "✅ Confirm" },
      { id: "confirm_no",  title: "❌ Cancel" },
    ],
  );
}

// ─── Order finalisation ───────────────────────────────────────────────────────

async function finaliseOrder(to: string, session: BotSession): Promise<void> {
  const orderId  = `HEC-${Date.now().toString(36).toUpperCase()}`;
  const sub      = cartSubtotal(session.cart);
  const total    = sub + SERVICE_FEE_EUR;

  const order: OrderDetails = {
    id:           orderId,
    createdAt:    new Date().toISOString(),
    items:        session.cart,
    subtotalEUR:  sub,
    serviceFeeEUR: SERVICE_FEE_EUR,
    totalEUR:     total,
    customer: {
      name:     session.name!,
      email:    session.email!,
      phone:    to,
      building: session.building!,
      room:     session.room!,
      slot:     session.slot!,
      notes:    session.notes,
    },
    kind:   detectOrderKind(session.cart),
    status: "pending_payment",
  };

  // Persist in in-memory store (admin dashboard)
  saveOrder(order);

  const payLink = buildRevolutPayLink({ amountEUR: total, orderId });

  // Fan-out: emails + CallMeBot operator alert
  await Promise.all([
    sendOrderConfirmationEmail(order),
    sendOperatorOrderEmail(order),
    notifyOperator(order),
  ]);

  // Mark session as done
  session.step = "done";
  saveSession(session);

  // Final message to student
  await sendText(
    to,
    [
      `✅ *Order ${orderId} placed!*`,
      "",
      `Total: *${total.toFixed(2)} €*`,
      "",
      "Pay via Revolut (tap the link):",
      payLink,
      "",
      "We'll confirm once we see your payment. 🙏",
      "Questions? Just reply here.",
      "",
      "Type *menu* to start a new order.",
    ].join("\n"),
  );
}

// ─── State-machine dispatcher ─────────────────────────────────────────────────

async function _dispatch(msg: IncomingMessage): Promise<void> {
  const { from } = msg;
  const input    = normalise(msg);
  const session  = getSession(from);

  // ── Global reset ────────────────────────────────────────────────────────────
  if (RESET_RE.test(input) || session.step === "start") {
    resetCart(session);
    session.step = "main_menu";
    saveSession(session);
    await sendWelcome(from);
    await sendMainMenu(from);
    return;
  }

  // ── Per-step logic ──────────────────────────────────────────────────────────
  switch (session.step) {

    // ── MAIN MENU ─────────────────────────────────────────────────────────────
    case "main_menu": {
      if (input === "menu_groceries") {
        session.step = "groceries_store";
        saveSession(session);
        await sendStoreMenu(from);
      } else if (input === "menu_laundry") {
        session.step = "laundry_service";
        saveSession(session);
        await sendLaundryMenu(from);
      } else if (input === "menu_custom") {
        session.step = "custom_text";
        saveSession(session);
        await sendText(
          from,
          "📝 Describe what you need (e.g. *2 baguettes* or *specific shampoo brand*):",
        );
      } else {
        await sendMainMenu(from);
      }
      break;
    }

    // ── GROCERIES: STORE ─────────────────────────────────────────────────────
    case "groceries_store": {
      if (input === "store_jouy") {
        session.temp.storeId = "jouy";
      } else if (input === "store_saclay") {
        session.temp.storeId = "saclay";
      } else {
        await sendStoreMenu(from);
        break;
      }
      // Encode current category-list page in productId field
      session.temp.productId = "catpage_0";
      session.step = "groceries_category";
      saveSession(session);
      await sendCategoryList(from, 0);
      break;
    }

    // ── GROCERIES: CATEGORY ───────────────────────────────────────────────────
    case "groceries_category": {
      if (input.startsWith("catpage_")) {
        // Pagination — stay on same step
        const page = Math.max(0, parseInt(input.replace("catpage_", ""), 10) || 0);
        session.temp.productId = `catpage_${page}`;
        saveSession(session);
        await sendCategoryList(from, page);
        break;
      }
      if (input.startsWith("cat_")) {
        const catId = input.slice(4); // everything after "cat_"
        if (!CATEGORIES.find((c) => c.id === catId)) {
          await sendCategoryList(from, 0);
          break;
        }
        session.temp.categoryId = catId;
        // Encode current product-list page in productId field
        session.temp.productId = "prodpage_0";
        session.step = "groceries_product";
        saveSession(session);
        await sendProductList(from, session, 0);
      } else {
        // Unknown input — re-prompt
        const currentCatPage =
          session.temp.productId?.startsWith("catpage_")
            ? Math.max(0, parseInt(session.temp.productId.replace("catpage_", ""), 10) || 0)
            : 0;
        await sendCategoryList(from, currentCatPage);
      }
      break;
    }

    // ── GROCERIES: PRODUCT ────────────────────────────────────────────────────
    case "groceries_product": {
      if (input.startsWith("prodpage_")) {
        const page = Math.max(0, parseInt(input.replace("prodpage_", ""), 10) || 0);
        session.temp.productId = `prodpage_${page}`;
        saveSession(session);
        await sendProductList(from, session, page);
        break;
      }
      if (input.startsWith("prod_")) {
        const productId = input.slice(5);
        const product   = PRODUCTS.find((p) => p.id === productId);
        if (!product) {
          await sendProductList(from, session, 0);
          break;
        }
        session.temp.productId = productId;
        session.step = "groceries_qty";
        saveSession(session);
        await sendText(
          from,
          `How many *${product.name}* (${product.unit}) would you like?\n\nEnter a number:`,
        );
      } else {
        const currentProdPage =
          session.temp.productId?.startsWith("prodpage_")
            ? Math.max(0, parseInt(session.temp.productId.replace("prodpage_", ""), 10) || 0)
            : 0;
        await sendProductList(from, session, currentProdPage);
      }
      break;
    }

    // ── GROCERIES: QUANTITY ───────────────────────────────────────────────────
    case "groceries_qty": {
      const qty = parseInt(input, 10);
      if (!qty || qty < 1 || qty > 99) {
        await sendText(from, "Please enter a valid quantity between 1 and 99:");
        break;
      }
      const product = PRODUCTS.find((p) => p.id === session.temp.productId);
      if (!product) {
        // Product lost — go back to category
        session.step = "groceries_category";
        session.temp.productId = "catpage_0";
        saveSession(session);
        await sendCategoryList(from, 0);
        break;
      }
      const existing = session.cart.find(
        (i) => i.kind === "product" && i.id === product.id,
      );
      if (existing) {
        existing.quantity += qty;
      } else {
        session.cart.push({
          kind:     "product",
          id:       product.id,
          name:     product.name,
          priceEUR: product.priceEUR,
          quantity: qty,
          emoji:    product.emoji,
          unit:     product.unit,
        });
      }
      session.step = "cart";
      saveSession(session);
      await sendCartView(from, session);
      break;
    }

    // ── LAUNDRY: SERVICE ──────────────────────────────────────────────────────
    case "laundry_service": {
      const svcId =
        input === "laundry_wash" ? "wash"
        : input === "laundry_dry" ? "dry"
        : null;
      if (!svcId) {
        await sendLaundryMenu(from);
        break;
      }
      session.temp.laundryServiceId = svcId;
      session.step = "laundry_kg";
      saveSession(session);
      const svc = LAUNDRY_SERVICES.find((s) => s.id === svcId)!;
      await sendText(
        from,
        `${svc.emoji} *${svc.name}* — ${svc.priceEUR.toFixed(2)} €/kg\n\n${svc.description}\n\nHow many *kg* of laundry?`,
      );
      break;
    }

    // ── LAUNDRY: KG ───────────────────────────────────────────────────────────
    case "laundry_kg": {
      const kg = parseFloat(input.replace(",", "."));
      if (!isFinite(kg) || kg <= 0 || kg > 50) {
        await sendText(from, "Please enter a valid weight (e.g. *3* or *2.5*), up to 50 kg:");
        break;
      }
      const svcId = session.temp.laundryServiceId;
      const svc   = LAUNDRY_SERVICES.find((s) => s.id === svcId);
      if (!svc) {
        session.step = "laundry_service";
        saveSession(session);
        await sendLaundryMenu(from);
        break;
      }
      const rounded = Math.round(kg * 10) / 10;
      const existing = session.cart.find(
        (i) => i.kind === "laundry" && i.id === svc.id,
      );
      if (existing) {
        existing.quantity = Math.round((existing.quantity + rounded) * 10) / 10;
      } else {
        session.cart.push({
          kind:     "laundry",
          id:       svc.id,
          name:     svc.name,
          priceEUR: svc.priceEUR,
          quantity: rounded,
          emoji:    svc.emoji,
          unit:     svc.unit,
        });
      }
      session.step = "cart";
      saveSession(session);
      await sendCartView(from, session);
      break;
    }

    // ── CUSTOM: TEXT ──────────────────────────────────────────────────────────
    case "custom_text": {
      if (input.length < 3) {
        await sendText(from, "Please describe your request in more detail (at least 3 characters):");
        break;
      }
      session.temp.customText = input.slice(0, 200);
      session.step = "custom_qty";
      saveSession(session);
      await sendText(from, `Got it: *${session.temp.customText}*\n\nHow many do you need?`);
      break;
    }

    // ── CUSTOM: QUANTITY ──────────────────────────────────────────────────────
    case "custom_qty": {
      const qty = parseInt(input, 10);
      if (!qty || qty < 1 || qty > 99) {
        await sendText(from, "Please enter a valid quantity (e.g. 1, 2, 3):");
        break;
      }
      const customText = session.temp.customText || "Custom request";
      session.cart.push({
        kind:     "custom",
        id:       `custom-${Date.now()}`,
        name:     customText.slice(0, 40),
        priceEUR: 0,
        quantity: qty,
        emoji:    "📝",
        unit:     "unit",
        note:     customText,
      });
      session.step = "cart";
      saveSession(session);
      await sendCartView(from, session);
      break;
    }

    // ── CART ──────────────────────────────────────────────────────────────────
    case "cart": {
      if (input === "cart_checkout") {
        if (session.cart.length === 0) {
          await sendText(from, "Your cart is empty — add something first!");
          session.step = "main_menu";
          saveSession(session);
          await sendMainMenu(from);
          break;
        }
        session.step = "ask_email";
        saveSession(session);
        const emailHint = session.email ? ` (last used: ${session.email})` : "";
        await sendText(from, `📧 Your *email address*${emailHint}:`);
      } else if (input === "cart_add") {
        session.step = "main_menu";
        saveSession(session);
        await sendMainMenu(from);
      } else if (input === "cart_clear") {
        resetCart(session);
        session.step = "main_menu";
        saveSession(session);
        await sendText(from, "🗑 Cart cleared.");
        await sendMainMenu(from);
      } else {
        await sendCartView(from, session);
      }
      break;
    }

    // ── CHECKOUT: EMAIL ───────────────────────────────────────────────────────
    case "ask_email": {
      const email = input.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await sendText(from, "That doesn't look like a valid email. Please try again:");
        break;
      }
      session.email = email;
      session.step  = "ask_name";
      saveSession(session);
      const nameHint = session.name ? ` (last used: ${session.name})` : "";
      await sendText(from, `👤 Your *full name*${nameHint}:`);
      break;
    }

    // ── CHECKOUT: NAME ────────────────────────────────────────────────────────
    case "ask_name": {
      if (input.length < 2) {
        await sendText(from, "Please enter your full name:");
        break;
      }
      session.name = input.slice(0, 80);
      session.step  = "ask_building";
      saveSession(session);
      const buildingHint = session.building ? ` (last used: ${session.building})` : "";
      await sendText(from, `🏠 Which *building* are you in${buildingHint}? (e.g. W1, S3, Résidence…)`);
      break;
    }

    // ── CHECKOUT: BUILDING ────────────────────────────────────────────────────
    case "ask_building": {
      if (input.length < 1) {
        await sendText(from, "Please enter your building name or number:");
        break;
      }
      session.building = input.slice(0, 40);
      session.step     = "ask_room";
      saveSession(session);
      const roomHint = session.room ? ` (last used: ${session.room})` : "";
      await sendText(from, `🚪 Your *room number*${roomHint}:`);
      break;
    }

    // ── CHECKOUT: ROOM ────────────────────────────────────────────────────────
    case "ask_room": {
      if (input.length < 1) {
        await sendText(from, "Please enter your room number:");
        break;
      }
      session.room = input.slice(0, 20);
      session.step = "ask_slot";
      saveSession(session);
      await sendSlotList(from);
      break;
    }

    // ── CHECKOUT: SLOT ────────────────────────────────────────────────────────
    case "ask_slot": {
      if (input.startsWith("slot_")) {
        const idx  = parseInt(input.replace("slot_", ""), 10);
        const slot = PICKUP_SLOTS[idx];
        if (!slot) {
          await sendSlotList(from);
          break;
        }
        session.slot = slot;
        session.step = "ask_notes";
        saveSession(session);
        await sendButtons(
          from,
          "Any notes for the delivery? (building code, leave at door, etc.)\n\nType your note or tap Skip:",
          [{ id: "notes_skip", title: "⏩ Skip" }],
        );
      } else {
        await sendSlotList(from);
      }
      break;
    }

    // ── CHECKOUT: NOTES ───────────────────────────────────────────────────────
    case "ask_notes": {
      session.notes = input === "notes_skip" ? undefined : input.slice(0, 200);
      session.step  = "confirm";
      saveSession(session);
      await sendOrderSummary(from, session);
      break;
    }

    // ── CHECKOUT: CONFIRM ─────────────────────────────────────────────────────
    case "confirm": {
      if (input === "confirm_yes") {
        await finaliseOrder(from, session);
      } else if (input === "confirm_no") {
        session.step = "cart";
        saveSession(session);
        await sendText(from, "Order cancelled — your cart is still saved.");
        await sendCartView(from, session);
      } else {
        // Re-show summary if user sends random text at confirm step
        await sendOrderSummary(from, session);
      }
      break;
    }

    // ── DONE ──────────────────────────────────────────────────────────────────
    case "done": {
      // Any message after order completion starts a new order
      resetCart(session);
      session.step = "main_menu";
      saveSession(session);
      await sendText(from, "👋 Ready for another order?");
      await sendMainMenu(from);
      break;
    }

    // ── FALLBACK ──────────────────────────────────────────────────────────────
    default: {
      resetCart(session);
      session.step = "main_menu";
      saveSession(session);
      await sendWelcome(from);
      await sendMainMenu(from);
    }
  }
}
