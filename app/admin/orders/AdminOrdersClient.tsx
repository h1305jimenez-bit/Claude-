"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderDetails } from "@/lib/types";

type StatusFilter = "all" | OrderDetails["status"];

export function AdminOrdersClient({ orders }: { orders: OrderDetails[] }) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const router = useRouter();

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  const stats = useMemo(() => {
    const revenue = orders.reduce((sum, o) => sum + o.totalEUR, 0);
    const pending = orders.filter((o) => o.status === "pending_payment").length;
    const active = orders.filter(
      (o) => o.status === "paid" || o.status === "in_progress",
    ).length;
    const done = orders.filter((o) => o.status === "delivered").length;
    return { revenue, pending, active, done };
  }, [orders]);

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-hec-navy">
            Operator dashboard
          </h1>
          <p className="text-xs text-slate-500">
            {orders.length} orders · {stats.revenue.toFixed(2)} € total
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-hec-stone bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          Log out
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Pending" value={stats.pending} tone="amber" />
        <StatBox label="Active" value={stats.active} tone="sky" />
        <StatBox label="Delivered" value={stats.done} tone="slate" />
      </div>

      <div className="rounded-2xl bg-hec-gold-soft/40 p-3 text-xs text-slate-700">
        💡 Orders are also emailed to your operator address — this dashboard
        is a convenience view. On Vercel the in-memory list may reset between
        deployments; the email is the reliable copy.
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(
          [
            ["all", "All"],
            ["pending_payment", "Pending"],
            ["paid", "Paid"],
            ["in_progress", "In progress"],
            ["delivered", "Delivered"],
          ] as [StatusFilter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === id
                ? "bg-hec-navy text-white"
                : "bg-white text-slate-600 border border-hec-stone"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          No orders {filter === "all" ? "yet" : `with status “${filter}”`}.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "sky" | "slate";
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-800",
    sky: "bg-sky-50 text-sky-800",
    slate: "bg-slate-100 text-slate-700",
  }[tone];
  return (
    <div className={`rounded-2xl p-3 text-center ${toneClass}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider">{label}</div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderDetails }) {
  const [open, setOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState(order.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const when = new Date(order.createdAt).toLocaleString();

  async function updateStatus(next: OrderDetails["status"]) {
    setError(null);
    const prev = localStatus;
    setLocalStatus(next); // optimistic
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setLocalStatus(prev); // rollback
      setError(err instanceof Error ? err.message : "Could not update");
    }
  }

  return (
    <li className="rounded-2xl bg-white p-4 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <div className="text-xs text-slate-500">{when}</div>
          <div className="text-sm font-semibold text-hec-navy">
            {order.id} · {order.customer.name}
          </div>
          <div className="text-xs text-slate-600">
            Bldg {order.customer.building} · Room {order.customer.room} ·{" "}
            {order.customer.slot}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-hec-navy">
            {order.totalEUR.toFixed(2)} €
          </div>
          <StatusBadge status={localStatus} />
        </div>
      </button>

      {/* Action buttons — visible even when collapsed so the operator can
          mark an order as delivered with one tap. */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-hec-stone pt-3">
        <ActionButton
          disabled={localStatus === "paid" || pending}
          onClick={() => updateStatus("paid")}
          tone="emerald"
        >
          💶 Mark paid
        </ActionButton>
        <ActionButton
          disabled={localStatus === "in_progress" || pending}
          onClick={() => updateStatus("in_progress")}
          tone="sky"
        >
          🚲 In progress
        </ActionButton>
        <ActionButton
          disabled={localStatus === "delivered" || pending}
          onClick={() => updateStatus("delivered")}
          tone="navy"
        >
          ✅ Complete
        </ActionButton>
      </div>

      {error && (
        <p className="mt-2 text-xs text-hec-burgundy">⚠️ {error}</p>
      )}

      {open && (
        <div className="mt-3 space-y-3 border-t border-hec-stone pt-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Field label="Email" value={order.customer.email} />
            <Field label="Phone" value={order.customer.phone} />
            <Field label="Kind" value={order.kind} />
            <Field label="Items" value={`${order.items.length}`} />
          </div>
          {order.customer.notes && (
            <div className="rounded-lg bg-hec-ivory p-2 text-xs text-slate-700">
              📝 {order.customer.notes}
            </div>
          )}
          <ul className="divide-y divide-hec-stone">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-start gap-2 py-2 text-sm">
                <span className="text-lg">{i.emoji}</span>
                <div className="flex-1">
                  <div>
                    {i.name}{" "}
                    <span className="text-slate-500">× {i.quantity}</span>
                    {i.kind === "custom" && (
                      <span className="ml-1 rounded bg-hec-gold-soft px-1.5 py-0.5 text-[10px] font-semibold text-hec-navy">
                        CUSTOM
                      </span>
                    )}
                  </div>
                  {i.kind === "custom" && i.note && i.note !== i.name && (
                    <div className="text-xs text-slate-600">“{i.note}”</div>
                  )}
                </div>
                <div className="text-xs font-medium">
                  {i.priceEUR > 0
                    ? `${(i.priceEUR * i.quantity).toFixed(2)} €`
                    : "TBD"}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-hec-stone pt-2 text-xs">
            <span>Subtotal</span>
            <span>{order.subtotalEUR.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Service fee</span>
            <span>{order.serviceFeeEUR.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between border-t border-hec-stone pt-2 text-sm font-semibold text-hec-navy">
            <span>Total</span>
            <span>{order.totalEUR.toFixed(2)} €</span>
          </div>
        </div>
      )}
    </li>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: "emerald" | "sky" | "navy";
}) {
  const toneClass = {
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    sky: "bg-sky-600 hover:bg-sky-700",
    navy: "bg-hec-navy hover:bg-hec-ink",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderDetails["status"] }) {
  const styles: Record<OrderDetails["status"], string> = {
    pending_payment: "bg-amber-100 text-amber-800",
    paid: "bg-emerald-100 text-emerald-800",
    in_progress: "bg-sky-100 text-sky-800",
    delivered: "bg-slate-200 text-slate-700",
  };
  const label: Record<OrderDetails["status"], string> = {
    pending_payment: "Pending",
    paid: "Paid",
    in_progress: "In progress",
    delivered: "Delivered",
  };
  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}
    >
      {label[status]}
    </span>
  );
}
