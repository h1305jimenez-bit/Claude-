"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { mxn, pagoVendedor, generarFolio } from "@/lib/format";
import type { Identificacion, SugerenciaPrecio } from "@/lib/identify";

type Paso = "inicio" | "identificando" | "resultado" | "listo";

// Reduce la imagen a máx. 1024px y la devuelve como dataURL JPEG (payload liviano).
function leerYRedimensionar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        let { width, height } = img;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function VenderPage() {
  const [paso, setPaso] = useState<Paso>("inicio");
  const [foto, setFoto] = useState<string | null>(null);
  const [info, setInfo] = useState<Identificacion | null>(null);
  const [precioElegido, setPrecioElegido] = useState<SugerenciaPrecio | null>(null);
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [folio, setFolio] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    const dataUrl = await leerYRedimensionar(file);
    setFoto(dataUrl);
    setPaso("identificando");
    try {
      const res = await fetch("/api/identificar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imagen: dataUrl }),
      });
      const data = (await res.json()) as Identificacion;
      setInfo(data);
      setPrecioElegido(data.precios?.find((p) => p.etiqueta === "Recomendado") ?? data.precios?.[1] ?? null);
      setPaso("resultado");
    } catch {
      setPaso("inicio");
      alert("No pudimos analizar la foto. Intenta de nuevo.");
    }
  }

  function confirmar() {
    if (!info || !precioElegido) return;
    setFolio(generarFolio());
    setPaso("listo");
  }

  function reiniciar() {
    setPaso("inicio");
    setFoto(null);
    setInfo(null);
    setPrecioElegido(null);
    setTelefono("");
    setDireccion("");
    setFolio("");
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
          <span className="text-sm font-semibold text-muted">Vender un producto</span>
        </div>
      </header>

      <div className="container-tv max-w-xl py-10">
        {/* PASO 1: subir foto */}
        {paso === "inicio" && (
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-ink">Toma una foto y nosotros lo vendemos</h1>
            <p className="mt-2 text-muted">
              Sube la foto de tu producto. La inteligencia artificial lo identifica
              y te sugiere el precio. Tú solo eliges. 📸
            </p>

            <button
              onClick={() => inputRef.current?.click()}
              className="mt-8 flex w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-brand-300 bg-white py-16 transition hover:border-brand-500 hover:bg-brand-50"
            >
              <span className="text-5xl">📷</span>
              <span className="text-lg font-semibold text-brand-700">Subir o tomar foto</span>
              <span className="text-sm text-muted">JPG o PNG</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />

            <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
              {[
                { e: "📤", t: "Subes la foto" },
                { e: "🤖", t: "La IA la identifica y pone precio" },
                { e: "🚚", t: "Nosotros vendemos y entregamos" },
              ].map((s) => (
                <div key={s.t} className="rounded-card bg-white p-3">
                  <div className="text-2xl">{s.e}</div>
                  <div className="mt-1 text-muted">{s.t}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: identificando */}
        {paso === "identificando" && (
          <div className="flex flex-col items-center py-16 text-center">
            {foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="producto" className="mb-6 h-48 w-48 rounded-card object-cover shadow-card" />
            )}
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
            <h2 className="mt-5 text-xl font-bold text-ink">Identificando tu producto…</h2>
            <p className="mt-1 text-muted">La IA está analizando la foto ✨</p>
          </div>
        )}

        {/* PASO 3: resultado + elegir precio */}
        {paso === "resultado" && info && (
          <div>
            <div className="flex items-center gap-4 rounded-card border border-brand-100 bg-white p-4">
              {foto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto} alt="producto" className="h-20 w-20 rounded-card object-cover" />
              )}
              <div>
                <span className="chip text-xs">{info.categoria} · {info.condicion}</span>
                <h2 className="mt-1 text-xl font-bold text-ink">{info.nombre}</h2>
                <p className="text-sm text-muted">{info.descripcion}</p>
              </div>
            </div>

            {info.demo && (
              <p className="mt-2 rounded-card bg-accent-500/10 p-2 text-center text-xs text-accent-600">
                Modo demo (sin IA real). Agrega <code>ANTHROPIC_API_KEY</code> para identificación real.
              </p>
            )}

            <h3 className="mt-6 font-bold text-ink">Elige tu precio</h3>
            <p className="text-sm text-muted">El cliente paga este precio. Tú recibes el 85% (la comisión de Telovendo es 15%).</p>

            <div className="mt-3 space-y-2">
              {info.precios.map((p) => {
                const sel = precioElegido?.etiqueta === p.etiqueta;
                return (
                  <button
                    key={p.etiqueta}
                    onClick={() => setPrecioElegido(p)}
                    className={`flex w-full items-center justify-between rounded-card border-2 p-4 text-left transition ${
                      sel ? "border-brand-500 bg-brand-50" : "border-brand-100 bg-white hover:border-brand-300"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-ink">{p.etiqueta}</div>
                      <div className="text-xs text-muted">{p.nota} · tú recibes {mxn(pagoVendedor(p.monto))}</div>
                    </div>
                    <div className="text-xl font-bold text-brand-600">{mxn(p.monto)}</div>
                  </button>
                );
              })}
            </div>

            {/* Datos para recoger */}
            <div className="mt-6 space-y-3 rounded-card border border-brand-100 bg-white p-4">
              <h3 className="font-bold text-ink">¿Dónde lo recogemos?</h3>
              <input
                className="campo-v"
                placeholder="Tu WhatsApp (10 dígitos)"
                inputMode="numeric"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/[^0-9]/g, ""))}
              />
              <input
                className="campo-v"
                placeholder="Dirección de recolección"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </div>

            <button
              onClick={confirmar}
              disabled={!precioElegido || telefono.length < 10 || !direccion.trim()}
              className="btn-primary mt-4 w-full disabled:opacity-40"
            >
              Vender por {precioElegido ? mxn(precioElegido.monto) : ""}
            </button>
            <button onClick={reiniciar} className="mt-2 w-full text-sm text-muted hover:text-ink">
              Subir otra foto
            </button>
          </div>
        )}

        {/* PASO 4: listo */}
        {paso === "listo" && info && precioElegido && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
              ✅
            </div>
            <h1 className="mt-4 text-3xl font-bold text-ink">¡Listo! Nosotros nos encargamos</h1>
            <p className="mt-2 text-muted">
              Recibimos <strong className="text-ink">{info.nombre}</strong>. Te
              escribimos por WhatsApp para coordinar la recolección. Cuando se
              venda, te depositamos <strong className="text-ink">{mxn(pagoVendedor(precioElegido.monto))}</strong>.
            </p>
            <div className="mt-6 rounded-card border border-brand-100 bg-white p-5 text-left">
              <div className="flex justify-between"><span className="text-muted">Folio</span><span className="font-mono font-bold text-brand-600">{folio}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted">Precio de venta</span><span className="font-semibold">{mxn(precioElegido.monto)}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted">Tú recibes (85%)</span><span className="font-semibold text-green-700">{mxn(pagoVendedor(precioElegido.monto))}</span></div>
            </div>
            <button onClick={reiniciar} className="btn-primary mt-6">
              Vender otro producto
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        .campo-v {
          width: 100%;
          border: 1px solid #b3cfff;
          border-radius: 10px;
          padding: 10px 12px;
          outline: none;
          font-size: 14px;
        }
        .campo-v:focus {
          border-color: #1877f2;
        }
      `}</style>
    </main>
  );
}
