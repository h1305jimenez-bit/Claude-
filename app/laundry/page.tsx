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
        <h1 className="text-xl font-bold text-hec-navy">Campus laundry</h1>
        <p className="text-sm text-slate-600">
          Simple pricing per kg. We pick up at your dorm, wash and/or dry and
          bring it back in 24–48 h.
        </p>
      </div>

      <div className="rounded-2xl bg-hec-gold-soft/50 p-4 text-sm text-hec-ink">
        <p className="font-semibold text-hec-navy">🧺 How it works</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Pick wash, dry, or both — add 1 per kg of laundry.</li>
          <li>Bag it and tell us your building letter and room.</li>
          <li>We weigh on pickup and return it folded within 24–48 h.</li>
        </ol>
        <p className="mt-2 text-xs text-slate-600">
          A 2.50 € service fee is added once at checkout.
        </p>
      </div>

      <div className="space-y-3">
        {LAUNDRY_SERVICES.map((s) => (
          <LaundryCard key={s.id} service={s} />
        ))}
      </div>

      {laundryCount > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-hec-stone bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">
                {laundryCount} kg booked
              </div>
              <div className="text-lg font-bold text-hec-navy">
                {subtotalEUR.toFixed(2)} €
              </div>
            </div>
            <Link
              href="/cart"
              className="flex-1 rounded-full bg-hec-navy py-3 text-center text-sm font-semibold text-white active:scale-[0.98]"
            >
              Continue
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
