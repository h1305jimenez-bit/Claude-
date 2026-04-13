"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, PRODUCTS } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/components/CartProvider";
import type { Category } from "@/lib/types";

export default function AuchanPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const { itemCount, subtotalEUR } = useCart();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category]);

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-xl font-bold text-hec-navy">Despensa Auchan</h1>
        <p className="text-sm text-slate-600">
          Selección de productos del Auchan de Vélizy.
        </p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar producto..."
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-hec-navy focus:outline-none"
      />

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              category === "all"
                ? "bg-hec-navy text-white"
                : "bg-white text-slate-600"
            }`}
          >
            Todo
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                category === c.id
                  ? "bg-hec-navy text-white"
                  : "bg-white text-slate-600"
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
            No encontramos productos con esos criterios.
          </p>
        )}
      </div>

      {itemCount > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">
                {itemCount} {itemCount === 1 ? "producto" : "productos"}
              </div>
              <div className="text-lg font-bold text-hec-navy">
                {subtotalEUR.toFixed(2)} €
              </div>
            </div>
            <Link
              href="/cart"
              className="flex-1 rounded-full bg-hec-navy py-3 text-center text-sm font-semibold text-white active:scale-[0.98]"
            >
              Ir al carrito
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
