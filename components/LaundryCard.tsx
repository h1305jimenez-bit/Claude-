"use client";

import { useCart } from "./CartProvider";
import type { LaundryService } from "@/lib/types";

export function LaundryCard({ service }: { service: LaundryService }) {
  const { items, addItem, updateQuantity } = useCart();
  const inCart = items.find((i) => i.id === service.id);
  const quantity = inCart?.quantity ?? 0;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-hec-cream text-3xl">
          {service.emoji}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold">{service.name}</h3>
            <span className="whitespace-nowrap font-semibold text-hec-navy">
              {service.priceEUR.toFixed(2)} €
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{service.description}</p>
          <p className="mt-1 text-xs text-slate-500">Price per {service.unit}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end">
        {quantity === 0 ? (
          <button
            type="button"
            onClick={() =>
              addItem({
                kind: "laundry",
                id: service.id,
                name: service.name,
                priceEUR: service.priceEUR,
                quantity: 1,
                emoji: service.emoji,
                unit: service.unit,
              })
            }
            className="rounded-full bg-hec-navy px-4 py-2 text-sm font-semibold text-white active:scale-95"
          >
            Book
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateQuantity(service.id, quantity - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 active:scale-95"
            >
              −
            </button>
            <span className="w-5 text-center font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(service.id, quantity + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-hec-navy text-white active:scale-95"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
