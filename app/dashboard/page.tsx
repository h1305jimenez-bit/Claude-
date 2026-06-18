"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { borrarSitio, listarSitios } from "@/lib/store";
import { giroDef } from "@/lib/templates";
import type { Sitio } from "@/lib/types";

export default function DashboardPage() {
  const [sitios, setSitios] = useState<Sitio[]>([]);
  const [cargado, setCargado] = useState(false);

  function recargar() {
    setSitios(listarSitios());
  }

  useEffect(() => {
    recargar();
    setCargado(true);
  }, []);

  function eliminar(id: string, nombre: string) {
    if (confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) {
      borrarSitio(id);
      recargar();
    }
  }

  return (
    <AppShell>
      <main className="container-tv py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-ink">Mis sitios</h1>
          <Link href="/crear" className="btn-primary px-5 py-2 text-sm">
            + Nuevo sitio
          </Link>
        </div>

        {cargado && sitios.length === 0 && (
          <div className="mt-12 rounded-card border border-dashed border-brand-200 bg-brand-50/50 p-12 text-center">
            <div className="text-5xl">🏪</div>
            <h2 className="mt-4 text-xl font-semibold text-ink">
              Aún no tienes sitios
            </h2>
            <p className="mt-2 text-muted">
              Crea tu primera página en segundos.
            </p>
            <Link href="/crear" className="btn-primary mt-6">
              Crear mi página
            </Link>
          </div>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sitios.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-card border border-brand-100 bg-white shadow-card">
              <div
                className="flex h-28 items-center justify-center text-5xl"
                style={{ background: s.tema.primario }}
              >
                {giroDef(s.giro).emoji}
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-ink">{s.nombreNegocio}</h3>
                <p className="text-sm text-muted">/{s.slug}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="chip text-xs">{giroDef(s.giro).nombre}</span>
                  {s.tiendaActiva && <span className="chip text-xs">🛒 Tienda</span>}
                  {s.productos.some((p) => p.enMarketplace) && (
                    <span className="chip text-xs">📦 Marketplace</span>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/dashboard/${s.id}`}
                    className="flex-1 rounded-pill bg-brand-500 py-2 text-center text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/sitio/${s.slug}`}
                    className="flex-1 rounded-pill border border-brand-200 py-2 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    Ver
                  </Link>
                  <button
                    onClick={() => eliminar(s.id, s.nombreNegocio)}
                    aria-label="Eliminar"
                    className="rounded-pill border border-brand-200 px-3 text-muted hover:bg-red-50 hover:text-red-500"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
