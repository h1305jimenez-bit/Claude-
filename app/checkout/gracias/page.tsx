"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { listarPedidos, obtenerSitioPorSlug } from "@/lib/store";
import { mxn, waLink } from "@/lib/format";
import type { Pedido } from "@/lib/types";

function Gracias() {
  const params = useSearchParams();
  const folios = (params.get("folios") || "").split(",").filter(Boolean);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    const todos = listarPedidos();
    setPedidos(todos.filter((p) => folios.includes(p.folio)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mensajeNegocio(p: Pedido): string {
    const lineas = p.items
      .map((i) => `• ${i.cantidad}x ${i.nombre} (${mxn(i.precio * i.cantidad)})`)
      .join("\n");
    return `Hola ${p.negocio}, tengo un pedido (${p.folio}):\n${lineas}\nTotal: ${mxn(
      p.total
    )}\nCliente: ${p.cliente.nombre} · ${p.cliente.telefono}`;
  }

  return (
    <main className="min-h-screen bg-brand-50/40">
      <div className="container-tv max-w-2xl py-12">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✅
          </div>
          <h1 className="mt-4 text-3xl font-bold text-ink">¡Pedido confirmado!</h1>
          <p className="mt-2 text-muted">
            Guardamos tu pedido. Aquí están los detalles.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {pedidos.map((p) => {
            const sitio = obtenerSitioPorSlug(p.slug);
            return (
              <div key={p.id} className="rounded-card border border-brand-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-brand-600">{p.folio}</span>
                  <span className="chip text-xs">
                    {p.tipo === "marketplace" ? "📦 Marketplace" : "🏪 Tienda"}
                  </span>
                </div>
                <h2 className="mt-1 font-semibold text-ink">{p.negocio}</h2>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {p.items.map((i) => (
                    <li key={i.productoId} className="flex justify-between">
                      <span>
                        {i.cantidad}× {i.nombre}
                      </span>
                      <span>{mxn(i.precio * i.cantidad)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-between border-t border-brand-100 pt-2 font-bold text-ink">
                  <span>Total</span>
                  <span>{mxn(p.total)}</span>
                </div>

                {p.tipo === "marketplace" ? (
                  <p className="mt-3 rounded-card bg-accent-500/10 p-3 text-sm text-ink">
                    🚚 <strong>Telovendo se encarga.</strong> En cuanto se libere
                    el pago, recogemos el producto con {p.negocio} y te lo
                    entregamos en tu domicilio.
                  </p>
                ) : (
                  sitio?.whatsapp && (
                    <a
                      href={waLink(sitio.whatsapp, mensajeNegocio(p))}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block rounded-pill bg-[#25D366] py-2.5 text-center text-sm font-semibold text-white"
                    >
                      💬 Avisar a {p.negocio} por WhatsApp
                    </a>
                  )
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/marketplace" className="btn-ghost">
            Seguir comprando
          </Link>
          <Link href="/" className="btn-primary">
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function GraciasPage() {
  return (
    <Suspense fallback={<div className="container-tv py-20 text-center text-muted">Cargando…</div>}>
      <Gracias />
    </Suspense>
  );
}
