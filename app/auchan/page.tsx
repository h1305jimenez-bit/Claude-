"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, PRODUCTS, STORES } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/components/CartProvider";
import type { Category, Store } from "@/lib/types";

type StoreFilter = Store | "all";

export default function AuchanPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [storeFilter, setStoreFilter] = useState<StoreFilter>("all");
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customAdded, setCustomAdded] = useState(false);
  const { itemCount, subtotalEUR, addItem } = useCart();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (storeFilter !== "all") {
        const store = p.store ?? "both";
        // "both" products show up regardless of store filter.
        if (store !== "both" && store !== storeFilter) return false;
      }
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category, storeFilter]);

  function handleAddCustom() {
    const text = customText.trim();
    if (!text) return;
    const est = parseFloat(customPrice.replace(",", "."));
    addItem({
      kind: "custom",
      id: `custom-${Date.now().toString(36)}`,
      name: text.slice(0, 80),
      note: text,
      priceEUR: Number.isFinite(est) && est > 0 ? est : 0,
      quantity: 1,
      emoji: "📝",
      unit: "request",
    });
    setCustomText("");
    setCustomPrice("");
    setCustomAdded(true);
    setTimeout(() => setCustomAdded(false), 2500);
  }

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-hec-navy">Auchan groceries</h1>
        <p className="text-sm text-slate-600">
          From Auchan Supermarché Jouy-en-Josas (across campus) and Auchan
          Saclay hypermarket (bigger selection).
        </p>
      </div>

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

      {/* Custom request — something not in the catalog */}
      <section className="rounded-2xl border border-dashed border-hec-gold bg-hec-gold-soft/40 p-4">
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <div className="text-sm font-semibold text-hec-navy">
              📝 Can't find it? Request something else
            </div>
            <div className="text-xs text-slate-600">
              Type whatever you want from Auchan — we'll buy it for you.
            </div>
          </div>
          <span className="text-hec-navy">{customOpen ? "−" : "+"}</span>
        </button>

        {customOpen && (
          <div className="mt-3 space-y-2">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={2}
              placeholder="e.g. 1 pack of Président camembert + 2 bottles of Orangina"
              className="w-full rounded-xl border border-hec-stone bg-white p-3 text-sm focus:border-hec-navy focus:outline-none"
              maxLength={300}
            />
            <div className="flex items-center gap-2">
              <input
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Estimated € (optional)"
                inputMode="decimal"
                className="w-40 rounded-xl border border-hec-stone bg-white px-3 py-2 text-sm focus:border-hec-navy focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!customText.trim()}
                className="flex-1 rounded-full bg-hec-navy py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Add request to cart
              </button>
            </div>
            {customAdded && (
              <p className="text-xs text-emerald-700">
                ✓ Added to cart. We'll confirm the real price before purchase.
              </p>
            )}
            <p className="text-xs text-slate-500">
              If you leave the price empty we'll message you to confirm the
              total before we check out.
            </p>
          </div>
        )}
      </section>

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
