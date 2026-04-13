"use client";

import { useCart } from "./CartProvider";
import type { LaundryService } from "@/lib/types";

export function LaundryCard({ service }: { service: LaundryService }) {
  const { items, addItem, updateQuantity } = useCart();
  const inCart = items.find((i) => i.id === service.id);
  const quantity = inCart?.quantity ?? 0;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-hec-sand text-3xl">
          {service.emoji}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-hec-navy">{service.name}</h3>
            <span className="whitespace-nowrap font-semibold text-hec-navy">
              {service.priceEUR.toFixed(2)} € / {service.unit}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{service.description}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-3">
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
            Add 1 kg
          </button>
        ) : (
          <>
            <span className="text-xs text-slate-500">kg</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateQuantity(service.id, quantity - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-hec-ivory text-hec-navy active:scale-95"
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
          </>
        )}
      </div>
    </div>
  );
}
