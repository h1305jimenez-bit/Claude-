"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { buildRevolutPayLink, REVOLUT_USERNAME } from "@/lib/revolut";
import type { OrderDetails } from "@/lib/types";

const ORDERS_KEY = "hec-delivery-orders:v1";

export default function OrderConfirmationPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const orders: OrderDetails[] = raw ? JSON.parse(raw) : [];
      const found = orders.find((o) => o.id === params.id);
      if (found) setOrder(found);
      else setNotFound(true);
    } catch {
      setNotFound(true);
    }
  }, [params.id]);

  function markAsPaid() {
    if (!order) return;
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const orders: OrderDetails[] = raw ? JSON.parse(raw) : [];
      const updated = orders.map((o) =>
        o.id === order.id ? { ...o, status: "paid" as const } : o,
      );
      localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
      setOrder({ ...order, status: "paid" });
    } catch {
      /* ignore */
    }
  }

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-lg font-semibold">Pedido no encontrado</h1>
        <Link href="/" className="mt-4 inline-block text-hec-navy underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center text-slate-500">Cargando pedido...</div>
    );
  }

  const payUrl = buildRevolutPayLink({
    amountEUR: order.totalEUR,
    orderId: order.id,
  });

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-3xl bg-hec-navy p-6 text-white">
        <div className="text-4xl">🎉</div>
        <h1 className="mt-2 text-xl font-bold">¡Pedido creado!</h1>
        <p className="text-sm text-white/80">
          Referencia <span className="font-mono">{order.id}</span>
        </p>
      </div>

      {order.status === "pending_payment" ? (
        <section className="space-y-3 rounded-2xl border-2 border-[#0666EB] bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-[#0666EB]">Paga con Revolut</h2>
          <p className="text-sm text-slate-600">
            Pulsa el botón para abrir Revolut y pagar{" "}
            <strong>{order.totalEUR.toFixed(2)} €</strong> a{" "}
            <span className="font-mono">@{REVOLUT_USERNAME}</span>. Usa la
            referencia <span className="font-mono">{order.id}</span>.
          </p>
          <a
            href={payUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-full bg-[#0666EB] py-3 text-center text-sm font-semibold text-white shadow"
          >
            Abrir Revolut y pagar {order.totalEUR.toFixed(2)} €
          </a>
          <button
            type="button"
            onClick={markAsPaid}
            className="block w-full rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700"
          >
            Ya he pagado
          </button>
          <p className="text-xs text-slate-500">
            Nota: en cuanto confirmemos el pago, un HECien pasará a entregar o
            recoger en la franja elegida.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl bg-green-50 p-4 text-sm text-green-800">
          ✅ Pago recibido. Te avisaremos por WhatsApp al{" "}
          <strong>{order.customer.phone}</strong> cuando el repartidor esté en
          camino.
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Detalles</h2>
        <dl className="space-y-1 text-sm">
          <Info label="Nombre" value={order.customer.name} />
          <Info label="Teléfono" value={order.customer.phone} />
          <Info
            label="Dorm"
            value={`${order.customer.dorm} · Hab. ${order.customer.room}`}
          />
          <Info
            label={order.kind === "laundry" ? "Recogida" : "Entrega"}
            value={order.customer.slot}
          />
          {order.customer.notes && (
            <Info label="Notas" value={order.customer.notes} />
          )}
        </dl>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Artículos</h2>
        <ul className="divide-y divide-slate-100">
          {order.items.map((i) => (
            <li
              key={i.id}
              className="flex items-center gap-3 py-2 text-sm"
            >
              <span className="text-xl">{i.emoji}</span>
              <span className="flex-1">
                {i.name}{" "}
                <span className="text-slate-500">× {i.quantity}</span>
              </span>
              <span className="font-medium">
                {(i.priceEUR * i.quantity).toFixed(2)} €
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <Row label="Subtotal" value={`${order.subtotalEUR.toFixed(2)} €`} />
          <Row
            label="Tarifa de servicio"
            value={`${order.serviceFeeEUR.toFixed(2)} €`}
          />
          <Row
            label={<span className="font-semibold">Total</span>}
            value={
              <span className="font-bold text-hec-navy">
                {order.totalEUR.toFixed(2)} €
              </span>
            }
          />
        </div>
      </section>

      <Link
        href="/"
        className="block text-center text-sm text-slate-500 underline"
      >
        Hacer otro pedido
      </Link>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
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
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}
