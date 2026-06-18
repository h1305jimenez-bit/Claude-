"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { listarMarketplace, type ProductoMarketplace } from "@/lib/store";

function mxn(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function MarketplacePage() {
  const [productos, setProductos] = useState<ProductoMarketplace[]>([]);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    setProductos(listarMarketplace());
    setCargado(true);
  }, []);

  return (
    <AppShell>
      {/* Banner explicativo */}
      <section className="bg-accent-500/10">
        <div className="container-tv py-12 text-center">
          <span className="chip bg-accent-500/20 text-accent-600">📦 Marketplace Telovendo</span>
          <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold text-ink sm:text-4xl">
            Productos de pymes mexicanas, enviados por nosotros
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            ¿Tienes un producto? Súbelo y nosotros lo mostramos, cobramos y lo
            enviamos por ti. Tú solo recibes tu dinero.
          </p>
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
                    <h3 className="font-semibold text-ink">{p.nombre}</h3>
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
                        className="rounded-pill bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                        onClick={() =>
                          alert(
                            "El carrito y el pago con Mercado Pago llegan en la Fase 3 🚧"
                          )
                        }
                      >
                        Comprar
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
