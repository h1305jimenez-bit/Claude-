import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIES, verifySessionToken } from "@/lib/auth";
import { sendOrderConfirmationEmail } from "@/lib/email";
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

  const result = await sendOrderConfirmationEmail(order);
  if (!result.ok) {
    return NextResponse.json(
      { error: `Could not send confirmation: ${result.reason}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
