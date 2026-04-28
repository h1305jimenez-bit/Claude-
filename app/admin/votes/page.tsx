import { isAdmin } from "@/lib/admin";
import { AdminLogin } from "@/app/admin/orders/AdminLogin";
import { AdminVotesClient } from "./AdminVotesClient";

export const dynamic = "force-dynamic";

export default async function AdminVotesPage() {
  const authed = await isAdmin();
  if (!authed) return <AdminLogin />;
  return <AdminVotesClient />;
}
