"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { cambiarEstadoPedido, listarPedidos } from "@/lib/store";
import { comisionTelovendo, ESTADO_LABEL, mxn, pagoVendedor } from "@/lib/format";
import type { EstadoPedido, Pedido } from "@/lib/types";

const ESTADOS: EstadoPedido[] = ["nuevo", "preparando", "enviado", "entregado"];

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargado, setCargado] = useState(false);

  function recargar() {
    setPedidos(listarPedidos());
  }
  useEffect(() => {
    recargar();
    setCargado(true);
  }, []);

  function setEstado(id: string, estado: EstadoPedido) {
    cambiarEstadoPedido(id, estado);
    recargar();
  }

  return (
    <AppShell>
      <main className="container-tv py-10">
        <h1 className="text-3xl font-bold text-ink">Pedidos</h1>
        <p className="mt-1 text-muted">Los pedidos de tus tiendas y del marketplace.</p>

        {cargado && pedidos.length === 0 && (
          <div className="mt-10 rounded-card border border-dashed border-brand-200 bg-brand-50/50 p-12 text-center">
            <div className="text-5xl">📋</div>
            <h2 className="mt-4 text-xl font-semibold text-ink">Aún no hay pedidos</h2>
            <p className="mt-2 text-muted">
              Cuando alguien compre en tu tienda o marketplace, aparecerá aquí.
            </p>
            <Link href="/marketplace" className="btn-primary mt-6">
              Ir al marketplace
            </Link>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {pedidos.map((p) => (
            <div key={p.id} className="rounded-card border border-brand-100 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-brand-600">{p.folio}</span>
                  <span className="chip text-xs">
                    {p.tipo === "marketplace" ? "📦 Marketplace" : "🏪 Tienda"}
                  </span>
                </div>
                <span className="text-lg font-bold text-ink">{mxn(p.total)}</span>
              </div>

              <p className="mt-1 text-sm text-muted">{p.negocio}</p>

              <ul className="mt-3 space-y-1 text-sm text-ink">
                {p.items.map((i) => (
                  <li key={i.productoId} className="flex justify-between">
                    <span>
                      {i.cantidad}× {i.nombre}
                    </span>
                    <span className="text-muted">{mxn(i.precio * i.cantidad)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-card bg-brand-50 p-3 text-sm text-ink">
                👤 {p.cliente.nombre} · {p.cliente.telefono}
                {p.cliente.direccion && (
                  <div className="text-muted">
                    🚚 {p.cliente.direccion}
                    {p.cliente.ciudad ? `, ${p.cliente.ciudad}` : ""}
                    {p.cliente.cp ? `, C.P. ${p.cliente.cp}` : ""}
                  </div>
                )}
                {p.cliente.notas && <div className="text-muted">📝 {p.cliente.notas}</div>}
              </div>

              {p.tipo === "marketplace" && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 rounded-card bg-green-50 p-2 text-xs">
                  <span className="font-semibold text-green-700">
                    💸 Pago al vendedor: {mxn(pagoVendedor(p.total))}
                  </span>
                  <span className="text-muted">
                    Comisión Telovendo (15%): {mxn(comisionTelovendo(p.total))}
                  </span>
                </div>
              )}

              {/* Estado */}
              <div className="mt-3 flex flex-wrap gap-2">
                {ESTADOS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEstado(p.id, e)}
                    className={`rounded-pill px-3 py-1 text-xs font-semibold transition ${
                      p.estado === e
                        ? "bg-brand-500 text-white"
                        : "border border-brand-200 text-muted hover:bg-brand-50"
                    }`}
                  >
                    {ESTADO_LABEL[e]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
