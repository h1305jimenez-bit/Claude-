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
          We pick up at your dorm, wash everything and bring it back in 24–48 h.
        </p>
      </div>

      <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">🧺 How pickup works</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Book a service here and choose a pickup slot.</li>
          <li>Bag your laundry in your dorm — we weigh it on pickup.</li>
          <li>Within 24–48 h we return it clean and folded.</li>
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
                {laundryCount} {laundryCount === 1 ? "service" : "services"}
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
