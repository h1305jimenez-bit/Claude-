"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

/**
 * Hero card at the top of the Auchan page for requesting anything that
 * isn't in the catalog. Expands on tap into a form with free-text
 * description and optional estimated price.
 */
export function CustomRequestCard() {
  const { addItem } = useCart();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState<string | null>(null);

  function addRequest() {
    const desc = text.trim();
    if (!desc) return;
    const est = parseFloat(price.replace(",", "."));
    addItem({
      kind: "custom",
      id: `custom-${Date.now().toString(36)}`,
      name: desc.slice(0, 80),
      note: desc,
      priceEUR: Number.isFinite(est) && est > 0 ? est : 0,
      quantity: qty,
      emoji: "📝",
      unit: "request",
    });
    setText("");
    setPrice("");
    setQty(1);
    setFlash(`Added! We'll confirm the price before we check out.`);
    setTimeout(() => setFlash(null), 3500);
  }

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-hec-navy via-hec-blue to-hec-navy p-[2px] shadow-card">
      <div className="rounded-[calc(1rem-2px)] bg-white p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 text-left"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-hec-gold-soft text-2xl">
            📝
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-hec-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-hec-navy">
                New
              </span>
              <span className="text-sm font-semibold text-hec-navy">
                Ask for anything else
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Not in the menu? Type what you want from Auchan — we'll buy it
              for you.
            </p>
          </div>
          <span className="text-lg text-hec-navy/60">{open ? "−" : "+"}</span>
        </button>

        {open && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                What do you want?
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="e.g. 1 Président camembert + 2 Orangina bottles"
                maxLength={300}
                className="w-full rounded-xl border border-hec-stone bg-hec-ivory p-3 text-sm focus:border-hec-navy focus:bg-white focus:outline-none"
              />
              <div className="mt-1 text-right text-[10px] text-slate-400">
                {text.length}/300
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Quantity
                </label>
                <div className="flex items-center rounded-xl border border-hec-stone bg-white">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-hec-navy"
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-sm font-semibold">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(20, q + 1))}
                    className="px-3 py-2 text-hec-navy"
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Est. price € (optional)
                </label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 4.50"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-hec-stone bg-white px-3 py-2 text-sm focus:border-hec-navy focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addRequest}
              disabled={!text.trim()}
              className="w-full rounded-full bg-hec-navy py-3 text-sm font-semibold text-white shadow active:scale-[0.99] disabled:opacity-50"
            >
              Add request to cart
            </button>

            {flash && (
              <p className="rounded-lg bg-emerald-50 p-2 text-center text-xs text-emerald-800">
                ✓ {flash}
              </p>
            )}

            <p className="text-[11px] leading-relaxed text-slate-500">
              Leave the price empty and we'll message you to confirm the
              real total before we shop.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
