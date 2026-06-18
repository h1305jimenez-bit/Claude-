"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { conteoCarrito, leerCarrito, totalCarrito } from "@/lib/store";
import { mxn } from "@/lib/format";

// Barra flotante de carrito para la tienda pública (usa el color del negocio).
export default function CartBar({ color }: { color: string }) {
  const [n, setN] = useState(0);
  const [t, setT] = useState(0);

  useEffect(() => {
    const sync = () => {
      const c = leerCarrito();
      setN(conteoCarrito(c));
      setT(totalCarrito(c));
    };
    sync();
    window.addEventListener("carrito-actualizado", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("carrito-actualizado", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (n === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 p-3">
      <Link
        href="/checkout"
        className="mx-auto flex max-w-2xl items-center justify-between rounded-pill px-6 py-3.5 font-semibold text-white shadow-lg"
        style={{ background: color }}
      >
        <span>
          🛒 {n} {n === 1 ? "producto" : "productos"}
        </span>
        <span className="flex items-center gap-2">
          {mxn(t)} <span className="opacity-80">· Ver carrito →</span>
        </span>
      </Link>
    </div>
  );
}
