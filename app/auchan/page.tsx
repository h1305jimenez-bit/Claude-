"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, PRODUCTS, STORES } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { CustomRequestCard } from "@/components/CustomRequestCard";
import { useCart } from "@/components/CartProvider";
import type { Category, Store } from "@/lib/types";

type StoreFilter = Store | "all";

export default function AuchanPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [storeFilter, setStoreFilter] = useState<StoreFilter>("all");
  const { itemCount, subtotalEUR } = useCart();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (storeFilter !== "all") {
        const store = p.store ?? "both";
        if (store !== "both" && store !== storeFilter) return false;
      }
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category, storeFilter]);

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-hec-navy">Auchan groceries</h1>
        <p className="text-sm text-slate-600">
          From Auchan Supermarché Jouy-en-Josas (across campus) and Auchan
          Saclay hypermarket (bigger selection).
        </p>
      </div>

      {/* Custom request — now a prominent hero card at the top. */}
      <CustomRequestCard />

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a product..."
        className="w-full rounded-xl border border-hec-stone bg-white px-4 py-3 text-sm shadow-card focus:border-hec-navy focus:outline-none"
      />

      {/* Store filter */}
      <div className="flex gap-2">
        <StoreChip
          active={storeFilter === "all"}
          onClick={() => setStoreFilter("all")}
          label="Both stores"
        />
        {STORES.filter((s) => s.id !== "both").map((s) => (
          <StoreChip
            key={s.id}
            active={storeFilter === s.id}
            onClick={() => setStoreFilter(s.id)}
            label={s.shortLabel}
          />
        ))}
      </div>

      {/* Category filter */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              category === "all"
                ? "bg-hec-navy text-white"
                : "bg-white text-slate-600 border border-hec-stone"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                category === c.id
                  ? "bg-hec-navy text-white"
                  : "bg-white text-slate-600 border border-hec-stone"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No products match your search.
          </p>
        )}
      </div>

      {itemCount > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-hec-stone bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </div>
              <div className="text-lg font-bold text-hec-navy">
                {subtotalEUR.toFixed(2)} €
              </div>
            </div>
            <Link
              href="/cart"
              className="flex-1 rounded-full bg-hec-navy py-3 text-center text-sm font-semibold text-white active:scale-[0.98]"
            >
              Go to cart
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StoreChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${
        active
          ? "bg-hec-gold text-hec-navy"
          : "bg-white text-slate-600 border border-hec-stone"
      }`}
    >
      {label}
    </button>
  );
}
