import { Resend } from "resend";
import type { OrderDetails } from "./types";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS =
  process.env.RESEND_FROM || "HEC Campus Delivery <onboarding@resend.dev>";

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  return new Resend(RESEND_API_KEY);
}

const BRAND = {
  navy: "#0C2340",
  gold: "#C9A227",
  ivory: "#FAF7F0",
};

export async function sendLoginCodeEmail(params: {
  to: string;
  code: string;
}): Promise<{ ok: boolean; reason?: string; devCode?: string }> {
  const client = getClient();
  const subject = `Your HEC Campus Delivery code: ${params.code}`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:${BRAND.ivory};padding:24px;">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
        <div style="font-size:14px;color:#64748b;letter-spacing:.08em;text-transform:uppercase;">HEC Campus Delivery</div>
        <h1 style="color:${BRAND.navy};margin:8px 0 16px;">Your login code</h1>
        <p style="color:#475569;margin:0 0 24px;">Enter this code in the app to sign in. It expires in 10 minutes.</p>
        <div style="font-size:40px;font-weight:700;letter-spacing:8px;color:${BRAND.navy};background:${BRAND.ivory};border:1px solid #E8E1D1;padding:20px;text-align:center;border-radius:12px;">${params.code}</div>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">If you didn't request this, you can ignore this email.</p>
      </div>
    </div>
  `;
  const text = `Your HEC Campus Delivery code is ${params.code}. It expires in 10 minutes.`;

  if (!client) {
    // Dev / local fallback: no Resend key configured. We log the code so
    // the developer can still test without setting up Resend.
    // eslint-disable-next-line no-console
    console.warn(
      `[email] RESEND_API_KEY missing. Dev login code for ${params.to}: ${params.code}`,
    );
    return { ok: true, devCode: params.code };
  }

  try {
    const { error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject,
      html,
      text,
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}

export async function sendOrderConfirmationEmail(
  order: OrderDetails,
): Promise<{ ok: boolean; reason?: string }> {
  const client = getClient();
  const subject = `Order ${order.id} received · HEC Campus Delivery`;
  const rows = order.items
    .map(
      (i) => `
        <tr>
          <td style="padding:6px 0;">${i.emoji} ${i.name} × ${i.quantity}</td>
          <td style="padding:6px 0;text-align:right;">${(i.priceEUR * i.quantity).toFixed(2)} €</td>
        </tr>`,
    )
    .join("");
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:${BRAND.ivory};padding:24px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
        <div style="font-size:14px;color:#64748b;letter-spacing:.08em;text-transform:uppercase;">HEC Campus Delivery</div>
        <h1 style="color:${BRAND.navy};margin:8px 0 8px;">Order received 🎉</h1>
        <p style="color:#475569;margin:0 0 16px;">Reference <strong>${order.id}</strong></p>

        <div style="border-top:1px solid #E8E1D1;padding-top:16px;margin-top:16px;">
          <table style="width:100%;font-size:14px;color:#334155;">${rows}</table>
          <table style="width:100%;font-size:14px;color:#334155;margin-top:12px;border-top:1px solid #E8E1D1;padding-top:8px;">
            <tr><td>Subtotal</td><td style="text-align:right;">${order.subtotalEUR.toFixed(2)} €</td></tr>
            <tr><td>Service fee</td><td style="text-align:right;">${order.serviceFeeEUR.toFixed(2)} €</td></tr>
            <tr><td style="font-weight:700;color:${BRAND.navy};padding-top:8px;">Total</td><td style="text-align:right;font-weight:700;color:${BRAND.navy};padding-top:8px;">${order.totalEUR.toFixed(2)} €</td></tr>
          </table>
        </div>

        <div style="margin-top:20px;font-size:14px;color:#475569;">
          <div><strong>Drop-off:</strong> Bldg ${order.customer.building} · Room ${order.customer.room}</div>
          <div><strong>${order.kind === "laundry" ? "Pickup slot" : "Delivery slot"}:</strong> ${order.customer.slot}</div>
          <div><strong>Phone:</strong> ${order.customer.phone}</div>
        </div>

        <div style="margin-top:24px;padding:16px;background:${BRAND.ivory};border-radius:12px;">
          <div style="font-weight:600;color:${BRAND.navy};">Next step: pay with Revolut</div>
          <div style="color:#475569;font-size:14px;margin-top:4px;">Pay ${order.totalEUR.toFixed(2)} € to <strong>@${process.env.NEXT_PUBLIC_REVOLUT_USERNAME || "hecparis2026"}</strong> with reference <strong>${order.id}</strong>. We'll confirm as soon as the payment lands.</div>
        </div>
      </div>
    </div>
  `;
  const text = `Order ${order.id} received. Total: ${order.totalEUR.toFixed(2)} €. Pay with Revolut to @${process.env.NEXT_PUBLIC_REVOLUT_USERNAME || "hecparis2026"} with reference ${order.id}.`;

  if (!client) {
    // eslint-disable-next-line no-console
    console.warn(`[email] RESEND_API_KEY missing. Order confirmation for ${order.customer.email} skipped.`);
    return { ok: true };
  }

  try {
    const { error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: order.customer.email,
      subject,
      html,
      text,
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}
