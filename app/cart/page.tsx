"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { PICKUP_SLOTS } from "@/lib/laundry";
import type { OrderDetails } from "@/lib/types";

const ORDERS_KEY = "hec-delivery-orders:v1";

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, subtotalEUR, clear } = useCart();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [building, setBuilding] = useState("");
  const [room, setRoom] = useState("");
  const [slot, setSlot] = useState(PICKUP_SLOTS[0]);
  const [notes, setNotes] = useState("");

  // Pre-fill the email from the signed-in session.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.email) setEmail(d.email);
      })
      .catch(() => {});
  }, []);

  const hasAuchan = items.some((i) => i.kind === "product");
  const hasLaundry = items.some((i) => i.kind === "laundry");
  const kind: OrderDetails["kind"] = hasAuchan && hasLaundry
    ? "mixed"
    : hasAuchan
    ? "auchan"
    : "laundry";

  const serviceFeeEUR = items.length === 0 ? 0 : 2.5;
  const totalEUR = useMemo(
    () => subtotalEUR + serviceFeeEUR,
    [subtotalEUR, serviceFeeEUR],
  );

  const canCheckout =
    items.length > 0 &&
    !!email.trim() &&
    !!name.trim() &&
    !!phone.trim() &&
    !!building.trim() &&
    !!room.trim();

  async function handleCheckout() {
    if (!canCheckout) return;
    const id = `HEC-${Date.now().toString(36).toUpperCase()}`;
    const order: OrderDetails = {
      id,
      createdAt: new Date().toISOString(),
      items,
      subtotalEUR,
      serviceFeeEUR,
      totalEUR,
      customer: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        building: building.trim().toUpperCase(),
        room: room.trim(),
        slot,
        notes: notes.trim() || undefined,
      },
      kind,
      status: "pending_payment",
    };

    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const orders: OrderDetails[] = raw ? JSON.parse(raw) : [];
      orders.unshift(order);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, 20)));
    } catch {
      /* ignore */
    }

    // Fire-and-forget the confirmation email.
    fetch("/api/orders/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    }).catch(() => {});

    clear();
    router.push(`/orders/${id}`);
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-5xl">🛒</div>
        <h2 className="mt-4 text-lg font-semibold text-hec-navy">
          Your cart is empty
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Take a look at our services.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/auchan"
            className="rounded-full bg-hec-navy py-3 font-semibold text-white"
          >
            Go to Auchan
          </Link>
          <Link
            href="/laundry"
            className="rounded-full border border-hec-navy py-3 font-semibold text-hec-navy"
          >
            Book laundry
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <h1 className="text-xl font-bold text-hec-navy">Your order</h1>

      <section className="space-y-2">
        {items.map((i) => (
          <div
            key={i.id}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-hec-sand text-2xl">
              {i.emoji}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{i.name}</div>
              <div className="text-xs text-slate-500">
                {i.priceEUR.toFixed(2)} € / {i.unit}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateQuantity(i.id, i.quantity - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-hec-ivory text-hec-navy"
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-semibold">
                {i.quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(i.id, i.quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-hec-navy text-white"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => removeItem(i.id)}
                className="ml-1 text-slate-400"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <h2 className="font-semibold text-hec-navy">Delivery details</h2>
        <Field label="Full name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Paula Martin"
            className="input"
          />
        </Field>
        <Field label="Email (pre-filled from your login)">
          <input
            type="email"
            value={email}
            readOnly
            className="input bg-hec-ivory text-slate-500"
          />
        </Field>
        <Field label="Mobile phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6..."
            type="tel"
            className="input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Building letter">
            <input
              value={building}
              onChange={(e) => setBuilding(e.target.value.toUpperCase())}
              placeholder="e.g. A"
              maxLength={3}
              className="input uppercase"
            />
          </Field>
          <Field label="Room number">
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. 214"
              className="input"
            />
          </Field>
        </div>
        <Field
          label={hasLaundry ? "Laundry pickup slot" : "Delivery slot"}
        >
          <select
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            className="input"
          >
            {PICKUP_SLOTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Door code, instructions, etc."
            rows={2}
            className="input"
          />
        </Field>
      </section>

      <section className="space-y-2 rounded-2xl bg-white p-4 shadow-card">
        <Row label="Subtotal" value={`${subtotalEUR.toFixed(2)} €`} />
        <Row label="Service fee" value={`${serviceFeeEUR.toFixed(2)} €`} />
        <div className="mt-2 border-t border-hec-stone pt-2">
          <Row
            label={<span className="font-semibold">Total</span>}
            value={
              <span className="text-lg font-bold text-hec-navy">
                {totalEUR.toFixed(2)} €
              </span>
            }
          />
        </div>
      </section>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={!canCheckout}
        className="w-full rounded-full bg-revolut-blue py-4 text-sm font-semibold text-white shadow-lg active:scale-[0.99] disabled:opacity-50"
      >
        Confirm & pay with Revolut
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e8e1d1;
          padding: 0.625rem 0.875rem;
          background-color: #faf7f0;
          font-size: 0.875rem;
          color: #051838;
        }
        .input:focus {
          outline: none;
          border-color: #0c2340;
          background-color: white;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}
