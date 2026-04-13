import { isAdmin } from "@/lib/admin";
import { listOrders } from "@/lib/orders-store";
import { AdminLogin } from "./AdminLogin";
import { AdminOrdersClient } from "./AdminOrdersClient";

// Never cache — we want fresh orders on every visit.
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const authed = await isAdmin();
  if (!authed) {
    return <AdminLogin />;
  }
  const orders = listOrders();
  return <AdminOrdersClient orders={orders} />;
}
