"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  cambiarCantidad,
  guardarPedido,
  leerCarrito,
  quitarDelCarrito,
  vaciarCarrito,
} from "@/lib/store";
import { generarFolio, mxn } from "@/lib/format";
import { nuevoId } from "@/lib/generator";
import type { ItemCarrito, Pedido } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [cargado, setCargado] = useState(false);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [cp, setCp] = useState("");
  const [notas, setNotas] = useState("");

  function sync() {
    setItems(leerCarrito());
  }

  useEffect(() => {
    sync();
    setCargado(true);
  }, []);

  const hayMarketplace = items.some((i) => i.tipo === "marketplace");
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  function setCant(item: ItemCarrito, n: number) {
    cambiarCantidad(item.productoId, item.tipo, n);
    sync();
  }
  function quitar(item: ItemCarrito) {
    quitarDelCarrito(item.productoId, item.tipo);
    sync();
  }

  const datosOk =
    nombre.trim() &&
    telefono.trim().length >= 10 &&
    (!hayMarketplace || (direccion.trim() && ciudad.trim() && cp.trim()));

  function confirmar() {
    if (!datosOk) return;

    // Agrupa por vendedor + tipo: cada grupo es un pedido.
    const grupos = new Map<string, ItemCarrito[]>();
    for (const it of items) {
      const key = `${it.tipo}:${it.sitioId}`;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(it);
    }

    const cliente = {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      direccion: direccion.trim() || undefined,
      ciudad: ciudad.trim() || undefined,
      cp: cp.trim() || undefined,
      notas: notas.trim() || undefined,
    };

    const folios: string[] = [];
    for (const grupo of Array.from(grupos.values())) {
      const folio = generarFolio();
      const pedido: Pedido = {
        id: nuevoId(),
        folio,
        tipo: grupo[0].tipo,
        sitioId: grupo[0].sitioId,
        negocio: grupo[0].negocio,
        slug: grupo[0].slug,
        items: grupo,
        total: grupo.reduce((s, i) => s + i.precio * i.cantidad, 0),
        cliente,
        estado: "nuevo",
        creadoEn: Date.now(),
      };
      guardarPedido(pedido);
      folios.push(folio);
    }

    vaciarCarrito();
    router.push(`/checkout/gracias?folios=${folios.join(",")}`);
  }

  return (
    <main className="min-h-screen bg-brand-50/40">
      <header className="border-b border-brand-100 bg-white">
        <div className="container-tv flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-lg font-black text-white">
              T
            </span>
            <span className="text-xl font-extrabold tracking-tight text-ink">
              Telo<span className="text-brand-500">vendo</span>
            </span>
          </Link>
          <span className="text-sm font-semibold text-muted">Pagar pedido</span>
        </div>
      </header>

      {cargado && items.length === 0 ? (
        <div className="container-tv py-20 text-center">
          <div className="text-5xl">🛒</div>
          <h1 className="mt-4 text-2xl font-bold text-ink">Tu carrito está vacío</h1>
          <p className="mt-2 text-muted">Agrega productos desde una tienda o el marketplace.</p>
          <Link href="/marketplace" className="btn-primary mt-6">
            Ir al marketplace
          </Link>
        </div>
      ) : (
        <div className="container-tv grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
          {/* Carrito */}
          <div>
            <h1 className="text-2xl font-bold text-ink">Tu pedido</h1>
            <div className="mt-4 space-y-3">
              {items.map((it) => (
                <div
                  key={`${it.tipo}-${it.productoId}`}
                  className="flex items-center gap-4 rounded-card border border-brand-100 bg-white p-4"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-card bg-brand-50 text-3xl">
                    {it.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-ink">{it.nombre}</h3>
                    <p className="text-xs text-muted">
                      {it.negocio}
                      {it.tipo === "marketplace" && " · 🚚 Telovendo lo recoge y entrega"}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setCant(it, it.cantidad - 1)}
                        className="h-7 w-7 rounded-full border border-brand-200 font-bold text-brand-700"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{it.cantidad}</span>
                      <button
                        onClick={() => setCant(it, it.cantidad + 1)}
                        className="h-7 w-7 rounded-full border border-brand-200 font-bold text-brand-700"
                      >
                        +
                      </button>
                      <button
                        onClick={() => quitar(it)}
                        className="ml-3 text-xs text-muted hover:text-red-500"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                  <span className="whitespace-nowrap font-bold text-ink">
                    {mxn(it.precio * it.cantidad)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Datos + resumen */}
          <div className="space-y-4">
            <div className="rounded-card border border-brand-100 bg-white p-5">
              <h2 className="font-bold text-ink">Tus datos</h2>
              <div className="mt-3 space-y-3">
                <input
                  className="campo-co"
                  placeholder="Nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
                <input
                  className="campo-co"
                  placeholder="Teléfono / WhatsApp (10 dígitos)"
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>

              {hayMarketplace && (
                <div className="mt-4 border-t border-brand-100 pt-4">
                  <h3 className="text-sm font-bold text-ink">
                    🚚 Dirección de entrega
                  </h3>
                  <p className="mb-2 text-xs text-muted">
                    Telovendo recoge el producto con el vendedor y te lo entrega aquí.
                  </p>
                  <div className="space-y-3">
                    <input
                      className="campo-co"
                      placeholder="Calle y número"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <input
                        className="campo-co"
                        placeholder="Ciudad"
                        value={ciudad}
                        onChange={(e) => setCiudad(e.target.value)}
                      />
                      <input
                        className="campo-co w-28"
                        placeholder="C.P."
                        inputMode="numeric"
                        value={cp}
                        onChange={(e) => setCp(e.target.value.replace(/[^0-9]/g, ""))}
                      />
                    </div>
                  </div>
                </div>
              )}

              <textarea
                className="campo-co mt-3"
                placeholder="Notas (opcional)"
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>

            <div className="rounded-card border border-brand-100 bg-white p-5">
              <div className="flex items-center justify-between text-lg font-bold text-ink">
                <span>Total</span>
                <span>{mxn(total)}</span>
              </div>
              <button
                onClick={confirmar}
                disabled={!datosOk}
                className="btn-primary mt-4 w-full disabled:opacity-40"
              >
                Confirmar pedido
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                Pago con Mercado Pago (tarjeta, SPEI, OXXO) llega en la Fase 3.
                Por ahora confirmamos y coordinamos contigo.
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .campo-co {
          width: 100%;
          border: 1px solid #b3cfff;
          border-radius: 10px;
          padding: 10px 12px;
          outline: none;
          font-size: 14px;
        }
        .campo-co:focus {
          border-color: #1877f2;
        }
      `}</style>
    </main>
  );
}
