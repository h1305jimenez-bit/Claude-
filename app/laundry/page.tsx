"use client";

import Link from "next/link";
import { LAUNDRY_SERVICES } from "@/lib/laundry";
import { LaundryCard } from "@/components/LaundryCard";
import { useCart } from "@/components/CartProvider";

export default function LaundryPage() {
  const { items, subtotalEUR } = useCart();
  const laundryCount = items
    .filter((i) => i.kind === "laundry")
    .reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-hec-navy">Lavandería campus</h1>
        <p className="text-sm text-slate-600">
          Pasamos por tu dorm, lavamos y te devolvemos la ropa en 24–48 h.
        </p>
      </div>

      <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">🧺 ¿Cómo funciona la recogida?</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Reserva aquí el servicio y elige franja horaria.</li>
          <li>Prepara la bolsa en tu dorm — nosotros la pesamos al recoger.</li>
          <li>En 24–48 h te devolvemos todo limpio y doblado.</li>
        </ol>
      </div>

      <div className="space-y-3">
        {LAUNDRY_SERVICES.map((s) => (
          <LaundryCard key={s.id} service={s} />
        ))}
      </div>

      {laundryCount > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">
                {laundryCount} {laundryCount === 1 ? "servicio" : "servicios"}
              </div>
              <div className="text-lg font-bold text-hec-navy">
                {subtotalEUR.toFixed(2)} €
              </div>
            </div>
            <Link
              href="/cart"
              className="flex-1 rounded-full bg-hec-navy py-3 text-center text-sm font-semibold text-white active:scale-[0.98]"
            >
              Continuar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
