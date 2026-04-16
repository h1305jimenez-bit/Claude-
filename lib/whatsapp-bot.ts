/**
 * WhatsApp Cloud API (Meta) — outbound message helpers.
 *
 * This file is the thin wrapper that the conversational bot uses to
 * REPLY to the user. Incoming messages land in
 * `/api/whatsapp/webhook` and are dispatched by `lib/bot-engine.ts`.
 *
 * ## Setup (one-time, ~30–45 min in Meta Business Manager)
 *
 *   1. https://business.facebook.com → create a Meta app (type "Business").
 *   2. In the app, add the product "WhatsApp" → "Getting Started".
 *   3. Meta gives you a FREE test number and a temporary token.
 *      • The test number can reply to up to 5 numbers that you verify
 *        manually — perfect to test the HEC bot before going live.
 *   4. Generate a permanent System User token (Business Settings →
 *      Users → System Users → "Generate new token" with `whatsapp_business_messaging`
 *      and `whatsapp_business_management` scopes). Put it in
 *      `WHATSAPP_ACCESS_TOKEN`.
 *   5. Copy the "Phone Number ID" (under WhatsApp → API Setup) into
 *      `WHATSAPP_PHONE_NUMBER_ID`.
 *   6. Configure the webhook in App Dashboard → WhatsApp → Configuration:
 *      • Callback URL: `https://<your-vercel-domain>/api/whatsapp/webhook`
 *      • Verify token: any random string — put the SAME value in
 *        `WHATSAPP_VERIFY_TOKEN`.
 *      • Subscribe to the `messages` field.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const GRAPH_VERSION = "v20.0";

function cfg() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return { token, phoneNumberId };
}

function endpoint(): string | null {
  const { phoneNumberId } = cfg();
  if (!phoneNumberId) return null;
  return `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
}

async function post(body: unknown): Promise<{ ok: boolean; reason?: string }> {
  const { token } = cfg();
  const url = endpoint();
  if (!token || !url) {
    // eslint-disable-next-line no-console
    console.warn(
      "[wa-bot] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing — skipping outbound message.",
    );
    return { ok: false, reason: "not-configured" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const reason = `HTTP ${res.status}: ${text.slice(0, 400)}`;
      // eslint-disable-next-line no-console
      console.error("[wa-bot] Graph API error:", reason);
      return { ok: false, reason };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "network error" };
  }
}

/** Plain text reply. */
export async function sendText(to: string, text: string) {
  return post({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text.slice(0, 4096), preview_url: false },
  });
}

export interface BotButton {
  /** Short id echoed back in webhook when tapped. Max 256 chars. */
  id: string;
  /** Button label (≤ 20 chars). */
  title: string;
}

/**
 * Interactive reply buttons — up to 3 buttons.
 * Titles must be ≤ 20 chars (Meta hard limit).
 */
export async function sendButtons(
  to: string,
  body: string,
  buttons: BotButton[],
  opts: { header?: string; footer?: string } = {},
) {
  const trimmed = buttons.slice(0, 3).map((b) => ({
    type: "reply" as const,
    reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
  }));
  return post({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      ...(opts.header
        ? { header: { type: "text", text: opts.header.slice(0, 60) } }
        : {}),
      body: { text: body.slice(0, 1024) },
      ...(opts.footer ? { footer: { text: opts.footer.slice(0, 60) } } : {}),
      action: { buttons: trimmed },
    },
  });
}

export interface BotListRow {
  /** Short id echoed back in webhook when tapped. */
  id: string;
  /** Row title (≤ 24 chars). */
  title: string;
  /** Optional description (≤ 72 chars). */
  description?: string;
}

export interface BotListSection {
  /** Section title (≤ 24 chars). */
  title: string;
  rows: BotListRow[];
}

/**
 * Interactive single-select list — great for long menus (categories,
 * product picks, time slots). Max 10 rows TOTAL across sections.
 */
export async function sendList(
  to: string,
  body: string,
  buttonLabel: string,
  sections: BotListSection[],
  opts: { header?: string; footer?: string } = {},
) {
  const cleanedSections = sections
    .map((s) => ({
      title: s.title.slice(0, 24),
      rows: s.rows.slice(0, 10).map((r) => ({
        id: r.id.slice(0, 200),
        title: r.title.slice(0, 24),
        ...(r.description ? { description: r.description.slice(0, 72) } : {}),
      })),
    }))
    .filter((s) => s.rows.length > 0);

  // Cap total rows at 10 across all sections (Meta limit).
  let remaining = 10;
  for (const s of cleanedSections) {
    if (s.rows.length > remaining) s.rows = s.rows.slice(0, remaining);
    remaining -= s.rows.length;
    if (remaining <= 0) break;
  }

  return post({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      ...(opts.header
        ? { header: { type: "text", text: opts.header.slice(0, 60) } }
        : {}),
      body: { text: body.slice(0, 1024) },
      ...(opts.footer ? { footer: { text: opts.footer.slice(0, 60) } } : {}),
      action: {
        button: buttonLabel.slice(0, 20),
        sections: cleanedSections,
      },
    },
  });
}

/** Mark an incoming message as read so the user sees the blue ticks. */
export async function markAsRead(messageId: string) {
  return post({
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}
