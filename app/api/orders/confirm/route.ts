import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIES, verifySessionToken } from "@/lib/auth";
import {
  sendOperatorOrderEmail,
  sendOrderConfirmationEmail,
} from "@/lib/email";
import { notifyOperator } from "@/lib/whatsapp";
import { saveOrder } from "@/lib/orders-store";
import type { OrderDetails } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = cookies().get(AUTH_COOKIES.session)?.value;
  const payload = session ? await verifySessionToken(session) : null;
  if (!payload) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const order = (await req.json().catch(() => null)) as OrderDetails | null;
  if (!order || order.customer?.email !== payload.email) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  // Persist in the (best-effort) in-memory store so the /admin dashboard
  // can show recent orders.
  saveOrder(order);

  // Fan out notifications in parallel. We report success as long as the
  // student confirmation email went out — operator alerts are best-effort.
  const [studentRes, operatorMailRes, whatsappRes] = await Promise.all([
    sendOrderConfirmationEmail(order),
    sendOperatorOrderEmail(order),
    notifyOperator(order),
  ]);

  if (!operatorMailRes.ok) {
    // eslint-disable-next-line no-console
    console.warn("[orders] operator email failed:", operatorMailRes.reason);
  }
  if (!whatsappRes.ok) {
    // eslint-disable-next-line no-console
    console.warn("[orders] whatsapp notification failed:", whatsappRes.reason);
  }

  if (!studentRes.ok) {
    return NextResponse.json(
      { error: `Could not send confirmation: ${studentRes.reason}` },
      { status: 502 },
    );
  }
  return NextResponse.json({
    ok: true,
    operatorEmail: operatorMailRes.ok,
    whatsapp: whatsappRes.ok,
  });
}
