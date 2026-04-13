"use client";

import { useCart } from "./CartProvider";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { items, addItem, updateQuantity } = useCart();
  const inCart = items.find((i) => i.id === product.id);
  const quantity = inCart?.quantity ?? 0;

  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-hec-cream text-3xl">
        {product.emoji}
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="text-sm font-medium leading-tight">{product.name}</div>
          <div className="text-xs text-slate-500">{product.unit}</div>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-semibold text-hec-navy">
            {product.priceEUR.toFixed(2)} €
          </span>
          {quantity === 0 ? (
            <button
              type="button"
              onClick={() =>
                addItem({
                  kind: "product",
                  id: product.id,
                  name: product.name,
                  priceEUR: product.priceEUR,
                  quantity: 1,
                  emoji: product.emoji,
                  unit: product.unit,
                })
              }
              className="rounded-full bg-hec-navy px-3 py-1 text-xs font-semibold text-white active:scale-95"
            >
              Add
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm active:scale-95"
                aria-label="Remove one"
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-semibold">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(product.id, quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-hec-navy text-sm text-white active:scale-95"
                aria-label="Add one"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
