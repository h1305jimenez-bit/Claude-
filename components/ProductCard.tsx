"use client";

import { useMemo, useState } from "react";
import { useCart } from "./CartProvider";
import type { Product } from "@/lib/types";

/**
 * ProductCard tries up to three image sources, in order, before
 * falling back to the emoji:
 *
 *   1. `product.imageUrl` — if the catalog sets an explicit URL.
 *   2. `/products/{product.id}.jpg` — drop a photo in
 *      `public/products/p-nutella.jpg` (matching the product id)
 *      and it appears here automatically. No code change needed.
 *   3. Emoji fallback.
 */
export function ProductCard({ product }: { product: Product }) {
  const { items, addItem, updateQuantity } = useCart();
  const inCart = items.find((i) => i.id === product.id);
  const quantity = inCart?.quantity ?? 0;

  const candidates = useMemo(() => {
    const list: string[] = [];
    if (product.imageUrl) list.push(product.imageUrl);
    list.push(`/products/${product.id}.jpg`);
    return list;
  }, [product.id, product.imageUrl]);

  const [attempt, setAttempt] = useState(0);
  const currentSrc = candidates[attempt];
  const showEmoji = attempt >= candidates.length;

  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-card">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-hec-sand">
        {!showEmoji ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={currentSrc}
            src={currentSrc}
            alt={product.name}
            className="h-full w-full object-cover"
            onError={() => setAttempt((a) => a + 1)}
            loading="lazy"
          />
        ) : (
          <span className="text-3xl">{product.emoji}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="text-sm font-medium leading-tight text-hec-ink">
            {product.name}
          </div>
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
                className="flex h-7 w-7 items-center justify-center rounded-full bg-hec-ivory text-hec-navy text-sm active:scale-95"
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
