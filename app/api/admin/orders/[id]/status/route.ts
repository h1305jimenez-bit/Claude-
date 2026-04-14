import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { listOrders, saveOrder } from "@/lib/orders-store";
import type { OrderDetails } from "@/lib/types";

export const runtime = "nodejs";

const VALID: OrderDetails["status"][] = [
  "pending_payment",
  "paid",
  "in_progress",
  "delivered",
];

/** PATCH /api/admin/orders/{id}/status  — body: { status } */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { status?: OrderDetails["status"] }
    | null;
  const next = body?.status;
  if (!next || !VALID.includes(next)) {
    return NextResponse.json(
      { error: "Invalid status. Expected one of: " + VALID.join(", ") },
      { status: 400 },
    );
  }

  const order = listOrders().find((o) => o.id === params.id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated: OrderDetails = { ...order, status: next };
  saveOrder(updated);

  return NextResponse.json({ ok: true, order: updated });
}
