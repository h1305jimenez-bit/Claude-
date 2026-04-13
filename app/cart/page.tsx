"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { HEC_DORMS, PICKUP_SLOTS } from "@/lib/laundry";
import type { OrderDetails } from "@/lib/types";

const ORDERS_KEY = "hec-delivery-orders:v1";

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, subtotalEUR, clear } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dorm, setDorm] = useState(HEC_DORMS[0]);
  const [room, setRoom] = useState("");
  const [slot, setSlot] = useState(PICKUP_SLOTS[0]);
  const [notes, setNotes] = useState("");

  const hasAuchan = items.some((i) => i.kind === "product");
  const hasLaundry = items.some((i) => i.kind === "laundry");
  const kind: OrderDetails["kind"] = hasAuchan && hasLaundry
    ? "mixed"
    : hasAuchan
    ? "auchan"
    : "laundry";

  const serviceFeeEUR = items.length === 0 ? 0 : 2.5;
  const totalEUR = useMemo(() => subtotalEUR + serviceFeeEUR, [subtotalEUR, serviceFeeEUR]);

  const canCheckout =
    items.length > 0 && name.trim() && phone.trim() && room.trim();

  function handleCheckout() {
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
        phone: phone.trim(),
        dorm,
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

    clear();
    router.push(`/orders/${id}`);
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-5xl">🛒</div>
        <h2 className="mt-4 text-lg font-semibold">Tu carrito está vacío</h2>
        <p className="mt-1 text-sm text-slate-600">
          Echa un vistazo a nuestros servicios.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/auchan"
            className="rounded-full bg-hec-navy py-3 font-semibold text-white"
          >
            Ir a Auchan
          </Link>
          <Link
            href="/laundry"
            className="rounded-full border border-hec-navy py-3 font-semibold text-hec-navy"
          >
            Reservar lavandería
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <h1 className="text-xl font-bold text-hec-navy">Tu pedido</h1>

      <section className="space-y-2">
        {items.map((i) => (
          <div
            key={i.id}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-hec-cream text-2xl">
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
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100"
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
                aria-label="Eliminar"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Datos de entrega</h2>
        <Field label="Nombre completo">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Paula Martín"
            className="input"
          />
        </Field>
        <Field label="Teléfono móvil">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6..."
            type="tel"
            className="input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dorm / residencia">
            <select
              value={dorm}
              onChange={(e) => setDorm(e.target.value)}
              className="input"
            >
              {HEC_DORMS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Número de habitación">
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Ej. 214"
              className="input"
            />
          </Field>
        </div>
        <Field
          label={
            hasLaundry
              ? "Franja de recogida de ropa"
              : "Franja de entrega"
          }
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
        <Field label="Notas (opcional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Código de puerta, instrucciones, etc."
            rows={2}
            className="input"
          />
        </Field>
      </section>

      <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
        <Row label="Subtotal" value={`${subtotalEUR.toFixed(2)} €`} />
        <Row
          label="Tarifa de servicio"
          value={`${serviceFeeEUR.toFixed(2)} €`}
        />
        <div className="mt-2 border-t pt-2">
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
        className="w-full rounded-full bg-[#0666EB] py-4 text-sm font-semibold text-white shadow-lg active:scale-[0.99] disabled:opacity-50"
      >
        Confirmar y pagar con Revolut
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          padding: 0.625rem 0.875rem;
          background-color: #f8fafc;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: #002b5c;
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
