"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  agregarAlCarrito,
  listarMarketplace,
  type ProductoMarketplace,
} from "@/lib/store";
import { mxn } from "@/lib/format";

export default function MarketplacePage() {
  const [productos, setProductos] = useState<ProductoMarketplace[]>([]);
  const [cargado, setCargado] = useState(false);
  const [agregado, setAgregado] = useState<string | null>(null);

  useEffect(() => {
    setProductos(listarMarketplace());
    setCargado(true);
  }, []);

  function comprar(p: ProductoMarketplace) {
    agregarAlCarrito({
      productoId: p.id,
      sitioId: p.sitioId,
      negocio: p.negocio,
      slug: p.slug,
      nombre: p.nombre,
      precio: p.precio,
      emoji: p.emoji,
      tipo: "marketplace",
    });
    setAgregado(p.id);
    setTimeout(() => setAgregado((cur) => (cur === p.id ? null : cur)), 1500);
  }

  return (
    <AppShell>
      {/* Banner explicativo */}
      <section className="bg-accent-500/10">
        <div className="container-tv py-12 text-center">
          <span className="chip bg-accent-500/20 text-accent-600">📦 Marketplace Telovendo</span>
          <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold text-ink sm:text-4xl">
            Vende sin riesgo. Sin moverte de casa.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Súbelo al marketplace. Cuando se venda,{" "}
            <strong className="text-ink">primero recibes tu dinero</strong> y
            apenas entonces pasamos a tu casa por el producto para entregarlo al
            cliente. 🚚
          </p>
          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2 text-sm">
            <span className="chip bg-white">1 · 📤 Súbelo</span>
            <span className="chip bg-white">2 · 💸 Se vende y te pagamos</span>
            <span className="chip bg-white">3 · 🚚 Pasamos por él y lo entregamos</span>
          </div>
          <Link href="/crear" className="btn-primary mt-6">
            Vender mi producto
          </Link>
        </div>
      </section>

      <main className="container-tv py-12">
        {cargado && productos.length === 0 && (
          <div className="rounded-card border border-dashed border-brand-200 bg-brand-50/50 p-12 text-center">
            <div className="text-5xl">🛒</div>
            <h2 className="mt-4 text-xl font-semibold text-ink">
              Aún no hay productos en el marketplace
            </h2>
            <p className="mt-2 text-muted">
              Crea un negocio, agrega un producto y márcalo como “Vender en el
              marketplace” para verlo aquí.
            </p>
            <Link href="/crear" className="btn-primary mt-6">
              Empezar
            </Link>
          </div>
        )}

        {productos.length > 0 && (
          <>
            <h2 className="mb-6 text-2xl font-bold text-ink">
              {productos.length} producto{productos.length !== 1 ? "s" : ""} disponible
              {productos.length !== 1 ? "s" : ""}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {productos.map((p) => (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-card border border-brand-100 bg-white shadow-card"
                >
                  <div className="flex h-40 items-center justify-center bg-brand-50 text-6xl">
                    {p.emoji}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-ink">{p.nombre}</h3>
                      {p.condicion && (
                        <span className="shrink-0 rounded-pill bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-600">
                          {p.condicion === "hecho_a_mano" ? "hecho a mano" : p.condicion}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{p.descripcion}</p>
                    <p className="mt-1 text-xs text-muted">
                      Vendido por{" "}
                      <Link href={`/sitio/${p.slug}`} className="text-brand-600 hover:underline">
                        {p.negocio}
                      </Link>
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold text-brand-600">{mxn(p.precio)}</span>
                      <button
                        className={`rounded-pill px-4 py-2 text-sm font-semibold text-white transition ${
                          agregado === p.id
                            ? "bg-green-600"
                            : "bg-brand-500 hover:bg-brand-600"
                        }`}
                        onClick={() => comprar(p)}
                      >
                        {agregado === p.id ? "✓ Agregado" : "Agregar 🛒"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
