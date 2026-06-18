"use client";

import { useState } from "react";
import { agregarAlCarrito } from "@/lib/store";
import type { ItemCarrito } from "@/lib/types";

export default function AddToCartButton({
  item,
  color,
}: {
  item: Omit<ItemCarrito, "cantidad">;
  color?: string;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      onClick={() => {
        agregarAlCarrito(item);
        setAdded(true);
        setTimeout(() => setAdded(false), 1300);
      }}
      className="mt-3 block w-full rounded-pill py-2 text-center text-sm font-semibold text-white transition active:scale-[0.98]"
      style={{ background: color || "#1877f2" }}
    >
      {added ? "✓ Agregado" : "Agregar al carrito"}
    </button>
  );
}
