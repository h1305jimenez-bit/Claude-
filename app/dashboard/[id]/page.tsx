"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SiteRenderer from "@/components/SiteRenderer";
import { guardarSitio, obtenerSitio } from "@/lib/store";
import { ESTILOS, estiloDef } from "@/lib/templates";
import { nuevoId } from "@/lib/generator";
import { comisionTelovendo, mxn, pagoVendedor } from "@/lib/format";
import type { EstiloId, HeroSeccion, Producto, Sitio } from "@/lib/types";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const [sitio, setSitio] = useState<Sitio | null>(null);
  const [cargado, setCargado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [reclamada, setReclamada] = useState(false);

  useEffect(() => {
    setSitio(obtenerSitio(params.id) ?? null);
    setCargado(true);
  }, [params.id]);

  function actualizar(next: Sitio) {
    setSitio(next);
    guardarSitio(next);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1200);
  }

  if (cargado && !sitio) {
    return (
      <main className="container-tv py-20 text-center">
        <h1 className="text-2xl font-bold text-ink">Sitio no encontrado</h1>
        <Link href="/dashboard" className="btn-primary mt-6">
          ← Volver a mis sitios
        </Link>
      </main>
    );
  }
  if (!sitio) return null;

  const hero = sitio.secciones.find((s) => s.tipo === "hero") as HeroSeccion | undefined;

  function setHero(campo: keyof HeroSeccion, valor: string) {
    actualizar({
      ...sitio!,
      secciones: sitio!.secciones.map((s) =>
        s.tipo === "hero" ? { ...s, [campo]: valor } : s
      ),
    });
  }

  function toggleSeccion(id: string) {
    actualizar({
      ...sitio!,
      secciones: sitio!.secciones.map((s) =>
        s.id === id ? { ...s, visible: !s.visible } : s
      ),
    });
  }

  function setEstilo(id: EstiloId) {
    actualizar({ ...sitio!, estilo: id, tema: estiloDef(id).tema });
  }

  function setProducto(prod: Producto) {
    actualizar({
      ...sitio!,
      productos: sitio!.productos.map((p) => (p.id === prod.id ? prod : p)),
    });
  }

  function addProducto() {
    const nuevo: Producto = {
      id: nuevoId(),
      nombre: "Nuevo producto",
      descripcion: "Descripción del producto",
      precio: 100,
      emoji: "🛍️",
      enMarketplace: false,
    };
    actualizar({ ...sitio!, productos: [...sitio!.productos, nuevo] });
  }

  function delProducto(id: string) {
    actualizar({ ...sitio!, productos: sitio!.productos.filter((p) => p.id !== id) });
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Panel de edición */}
      <aside className="w-full shrink-0 overflow-y-auto border-r border-brand-100 bg-white p-5 lg:h-screen lg:w-[380px]">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">
            ← Mis sitios
          </Link>
          <span className={`text-xs ${guardado ? "text-green-600" : "text-muted"}`}>
            {guardado ? "✓ Guardado" : "Guarda automático"}
          </span>
        </div>

        <h1 className="mt-4 text-xl font-bold text-ink">{sitio.nombreNegocio}</h1>
        <Link
          href={`/sitio/${sitio.slug}`}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          Ver página pública →
        </Link>

        {/* Datos generales */}
        <Section titulo="Datos del negocio">
          <Campo label="Nombre">
            <input
              className="campo"
              value={sitio.nombreNegocio}
              onChange={(e) =>
                actualizar({ ...sitio, nombreNegocio: e.target.value })
              }
            />
          </Campo>
          <Campo label="WhatsApp">
            <input
              className="campo"
              value={sitio.whatsapp}
              inputMode="numeric"
              onChange={(e) =>
                actualizar({ ...sitio, whatsapp: e.target.value.replace(/[^0-9]/g, "") })
              }
            />
          </Campo>
        </Section>

        {/* Portada (hero) */}
        {hero && (
          <Section titulo="Portada">
            <Campo label="Título">
              <input
                className="campo"
                value={hero.titulo}
                onChange={(e) => setHero("titulo", e.target.value)}
              />
            </Campo>
            <Campo label="Subtítulo">
              <textarea
                className="campo"
                rows={2}
                value={hero.subtitulo}
                onChange={(e) => setHero("subtitulo", e.target.value)}
              />
            </Campo>
            <Campo label="Botón">
              <input
                className="campo"
                value={hero.cta}
                onChange={(e) => setHero("cta", e.target.value)}
              />
            </Campo>
          </Section>
        )}

        {/* Estilo */}
        <Section titulo="Estilo">
          <div className="grid grid-cols-2 gap-2">
            {ESTILOS.map((e) => (
              <button
                key={e.id}
                onClick={() => setEstilo(e.id)}
                className={`flex items-center gap-2 rounded-card border-2 p-2 text-sm ${
                  sitio.estilo === e.id ? "border-brand-500" : "border-brand-100"
                }`}
              >
                <span className="h-5 w-5 rounded-full" style={{ background: e.tema.primario }} />
                {e.nombre}
              </button>
            ))}
          </div>
        </Section>

        {/* Tienda */}
        <Section titulo="Tienda">
          <label className="flex items-center justify-between">
            <span className="text-sm text-ink">Activar tienda en mi página</span>
            <input
              type="checkbox"
              checked={sitio.tiendaActiva}
              onChange={(e) => actualizar({ ...sitio, tiendaActiva: e.target.checked })}
              className="h-5 w-5 accent-brand-500"
            />
          </label>

          {sitio.tiendaActiva && (
            <div className="mt-3 space-y-3">
              {sitio.productos.map((p) => (
                <div key={p.id} className="rounded-card border border-brand-100 p-3">
                  <div className="flex gap-2">
                    <input
                      className="campo w-14 text-center"
                      value={p.emoji}
                      onChange={(e) => setProducto({ ...p, emoji: e.target.value })}
                    />
                    <input
                      className="campo flex-1"
                      value={p.nombre}
                      onChange={(e) => setProducto({ ...p, nombre: e.target.value })}
                    />
                  </div>
                  <input
                    className="campo mt-2"
                    value={p.descripcion}
                    onChange={(e) => setProducto({ ...p, descripcion: e.target.value })}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-muted">$</span>
                    <input
                      type="number"
                      className="campo w-24"
                      value={p.precio}
                      onChange={(e) => setProducto({ ...p, precio: Number(e.target.value) })}
                    />
                    <button
                      onClick={() => delProducto(p.id)}
                      className="ml-auto text-sm text-muted hover:text-red-500"
                    >
                      Eliminar
                    </button>
                  </div>
                  <label className="mt-2 flex items-center gap-2 rounded-card bg-accent-500/10 p-2 text-sm">
                    <input
                      type="checkbox"
                      checked={p.enMarketplace}
                      onChange={(e) => setProducto({ ...p, enMarketplace: e.target.checked })}
                      className="h-4 w-4 accent-accent-500"
                    />
                    📦 Vender en el marketplace (lo vendemos y entregamos)
                  </label>

                  {p.enMarketplace && (
                    <div className="mt-2 space-y-2 rounded-card border border-accent-400/40 bg-accent-500/5 p-3">
                      {/* Desglose 85/15 */}
                      <div className="flex flex-wrap justify-between gap-1 text-xs">
                        <span className="text-muted">
                          Cliente paga <strong className="text-ink">{mxn(p.precio)}</strong>
                        </span>
                        <span className="text-muted">
                          Fee 15% <strong className="text-ink">{mxn(comisionTelovendo(p.precio))}</strong>
                        </span>
                        <span className="font-semibold text-green-700">
                          Tú recibes {mxn(pagoVendedor(p.precio))}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <select
                          className="campo"
                          value={p.condicion ?? "nuevo"}
                          onChange={(e) =>
                            setProducto({ ...p, condicion: e.target.value as Producto["condicion"] })
                          }
                        >
                          <option value="nuevo">Nuevo</option>
                          <option value="usado">Usado</option>
                          <option value="hecho_a_mano">Hecho a mano</option>
                        </select>
                        <select
                          className="campo"
                          value={p.tamano ?? "chico"}
                          onChange={(e) =>
                            setProducto({ ...p, tamano: e.target.value as Producto["tamano"] })
                          }
                        >
                          <option value="chico">Chico</option>
                          <option value="mediano">Mediano</option>
                          <option value="grande">Grande</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted">
                        Inventario
                        <input
                          type="number"
                          className="campo w-20"
                          value={p.inventario ?? 1}
                          min={0}
                          onChange={(e) =>
                            setProducto({ ...p, inventario: Number(e.target.value) })
                          }
                        />
                        unidades
                      </label>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addProducto} className="btn-ghost w-full py-2 text-sm">
                + Agregar producto
              </button>
            </div>
          )}
        </Section>

        {/* Datos del vendedor para el marketplace */}
        {sitio.productos.some((p) => p.enMarketplace) && (
          <Section titulo="Datos para el marketplace">
            <p className="-mt-1 text-xs text-muted">
              Vendemos por ti: pasamos por el producto y lo entregamos al cliente.
              Te depositamos en cuanto se vende.
            </p>
            <Campo label="¿Dónde recogemos los productos?">
              <input
                className="campo"
                placeholder="Calle, número, colonia, ciudad"
                value={sitio.recoleccion ?? ""}
                onChange={(e) => actualizar({ ...sitio, recoleccion: e.target.value })}
              />
            </Campo>
            <Campo label="¿A qué cuenta te pagamos? (CLABE)">
              <input
                className="campo"
                placeholder="18 dígitos"
                inputMode="numeric"
                value={sitio.cuentaPago ?? ""}
                onChange={(e) =>
                  actualizar({ ...sitio, cuentaPago: e.target.value.replace(/[^0-9]/g, "") })
                }
              />
            </Campo>
          </Section>
        )}

        {/* Secciones */}
        <Section titulo="Secciones visibles">
          <div className="space-y-2">
            {sitio.secciones.map((s) => (
              <label key={s.id} className="flex items-center justify-between text-sm capitalize">
                <span className="text-ink">{s.tipo}</span>
                <input
                  type="checkbox"
                  checked={s.visible}
                  onChange={() => toggleSeccion(s.id)}
                  className="h-5 w-5 accent-brand-500"
                />
              </label>
            ))}
          </div>
        </Section>
      </aside>

      {/* Vista previa */}
      <main className="flex-1 bg-brand-50/40 p-3 lg:h-screen lg:overflow-y-auto lg:p-6">
        {/* Aviso: preview + 24 h + $99 */}
        <div className="mx-auto mb-4 max-w-4xl rounded-card border border-accent-400/50 bg-accent-500/10 p-4">
          {reclamada ? (
            <p className="text-center text-sm font-medium text-ink">
              🎉 ¡Listo! Apartaste tu página. Te confirmamos por WhatsApp en las
              próximas <strong>24 horas</strong>. La suscripción de $29 al mes se
              cobra al publicar (lo conectamos con Mercado Pago muy pronto).
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-sm text-ink">
                ✨ <strong>Esta es tu vista previa.</strong> En 24 h confirmamos
                tu página. Si te la quieres quedar, son{" "}
                <strong className="text-accent-600">$29 al mes</strong>.
              </p>
              <button
                onClick={() => setReclamada(true)}
                className="shrink-0 rounded-pill bg-accent-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
              >
                Quedármela · $29/mes
              </button>
            </div>
          )}
        </div>

        <p className="mb-3 text-center text-sm text-muted">Vista previa en vivo</p>
        <div className="mx-auto max-w-4xl overflow-hidden rounded-card border border-brand-100 bg-white shadow-card">
          <SiteRenderer sitio={sitio} />
        </div>
      </main>

      <style jsx global>{`
        .campo {
          width: 100%;
          border: 1px solid #d5ccff;
          border-radius: 10px;
          padding: 8px 12px;
          outline: none;
          font-size: 14px;
        }
        .campo:focus {
          border-color: #6d3bff;
        }
      `}</style>
    </div>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 border-t border-brand-100 pt-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
        {titulo}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
