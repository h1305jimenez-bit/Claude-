import type { OrderDetails } from "./types";

/**
 * Send a WhatsApp message to the operator using CallMeBot — a free public
 * service that lets you trigger WhatsApp messages via a simple HTTP GET.
 *
 * Setup (one-time, ~2 minutes):
 *   1. Save +34 644 51 95 23 to your phone contacts as "CallMeBot".
 *   2. From the operator phone (the one that will RECEIVE the alerts),
 *      send a WhatsApp message to that contact with the text:
 *         I allow callmebot to send me messages
 *   3. You'll receive a reply with your personal API key.
 *   4. Put your phone (with country code, no "+" or spaces) in
 *      CALLMEBOT_PHONE and the API key in CALLMEBOT_API_KEY.
 *
 * Docs: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 */

const CALLMEBOT_ENDPOINT = "https://api.callmebot.com/whatsapp.php";

export async function notifyOperator(
  order: OrderDetails,
): Promise<{ ok: boolean; reason?: string }> {
  const phone = (process.env.CALLMEBOT_PHONE || "").replace(/[^0-9]/g, "");
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!phone || !apiKey) {
    // eslint-disable-next-line no-console
    console.warn(
      "[whatsapp] CALLMEBOT_PHONE or CALLMEBOT_API_KEY missing — WhatsApp notification skipped.",
    );
    return { ok: true, reason: "not-configured" };
  }

  const lines: string[] = [];
  lines.push(`*New HEC order* ${order.id}`);
  lines.push(
    order.kind === "laundry"
      ? "🧺 Laundry pickup"
      : order.kind === "mixed"
      ? "🛒 Groceries + 🧺 Laundry"
      : "🛒 Auchan groceries",
  );
  lines.push("");
  lines.push(`👤 ${order.customer.name}`);
  lines.push(`📧 ${order.customer.email}`);
  lines.push(`📱 ${order.customer.phone}`);
  lines.push(`🏠 Bldg ${order.customer.building} · Room ${order.customer.room}`);
  lines.push(`⏰ ${order.customer.slot}`);
  if (order.customer.notes) lines.push(`📝 ${order.customer.notes}`);
  lines.push("");
  lines.push("Items:");
  for (const i of order.items) {
    const prefix = i.kind === "custom" ? "📝 Custom: " : "• ";
    const priceLabel =
      i.priceEUR > 0 ? ` — ${(i.priceEUR * i.quantity).toFixed(2)} €` : "";
    lines.push(`${prefix}${i.name} ×${i.quantity}${priceLabel}`);
    if (i.kind === "custom" && i.note && i.note !== i.name) {
      lines.push(`   “${i.note}”`);
    }
  }
  lines.push("");
  lines.push(`💶 Total: ${order.totalEUR.toFixed(2)} €`);
  lines.push(
    `💳 Revolut @${process.env.NEXT_PUBLIC_REVOLUT_USERNAME || "hecparis2026"} · ref ${order.id}`,
  );

  const text = lines.join("\n");
  const url = `${CALLMEBOT_ENDPOINT}?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: `CallMeBot ${res.status}: ${body.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "network error",
    };
  }
}
