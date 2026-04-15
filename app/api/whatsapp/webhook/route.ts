/**
 * app/api/whatsapp/webhook/route.ts
 *
 * Meta WhatsApp Cloud API webhook.
 *
 * GET  — one-time verification challenge from Meta (called when you first
 *         configure the webhook URL in the Meta App Dashboard).
 * POST — every inbound message / status update from WhatsApp.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
 */

import { type NextRequest, NextResponse } from "next/server";
import { markAsRead } from "@/lib/whatsapp-bot";
import { handleIncoming } from "@/lib/bot-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET — webhook verification ──────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode      === "subscribe" &&
    token     === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge !== null
  ) {
    // Meta expects the raw challenge string back as plain text
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST — inbound messages / status updates ─────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Always return 200 to Meta — otherwise it retries and eventually
  // disables the webhook.
  try {
    const body = await req.json().catch(() => null);

    // Extract the first message from the nested Cloud API payload:
    // body.entry[0].changes[0].value.messages[0]
    const messages: unknown[] | undefined =
      body?.entry?.[0]?.changes?.[0]?.value?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      // Could be a status update (delivered / read receipt) — ignore silently.
      return NextResponse.json({ ok: true });
    }

    const message = messages[0] as Record<string, unknown>;
    const from    = message.from as string | undefined;

    if (!from) {
      return NextResponse.json({ ok: true });
    }

    const messageId = (message.id as string | undefined) ?? "";

    // Resolve the effective input depending on message type
    let text: string | undefined;
    let buttonId: string | undefined;
    let listId: string | undefined;

    const type = message.type as string | undefined;

    if (type === "text") {
      const textObj = message.text as Record<string, unknown> | undefined;
      text = (textObj?.body as string | undefined)?.trim();
    } else if (type === "interactive") {
      const interactive = message.interactive as Record<string, unknown> | undefined;
      const interactiveType = interactive?.type as string | undefined;

      if (interactiveType === "button_reply") {
        const reply = interactive?.button_reply as Record<string, unknown> | undefined;
        buttonId = reply?.id as string | undefined;
      } else if (interactiveType === "list_reply") {
        const reply = interactive?.list_reply as Record<string, unknown> | undefined;
        listId = reply?.id as string | undefined;
      }
    }
    // Other types (image, audio, sticker, etc.) arrive with no text/buttonId/listId.
    // The bot-engine treats empty input as an unknown command and re-prompts.

    // Mark as read immediately (shows blue ticks on the user's phone)
    void markAsRead(messageId).catch((err: unknown) =>
      console.warn("[webhook] markAsRead failed:", err),
    );

    // Dispatch to the state machine — awaited so Vercel doesn't cut the
    // function before the reply messages are sent.
    await handleIncoming({ from, messageId, text, buttonId, listId });
  } catch (err) {
    // Log but never surface a 5xx to Meta (would trigger retries)
    console.error("[webhook] Unexpected error:", err);
  }

  return NextResponse.json({ ok: true });
}
