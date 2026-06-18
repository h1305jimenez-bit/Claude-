"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ESTILOS, GIROS } from "@/lib/templates";
import { generarSitio } from "@/lib/generator";
import { guardarSitio } from "@/lib/store";
import type { EstiloId, GiroId } from "@/lib/types";

export default function CrearPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [giro, setGiro] = useState<GiroId | null>(null);
  const [estilo, setEstilo] = useState<EstiloId | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [generando, setGenerando] = useState(false);

  const total = 3;

  function generar() {
    if (!giro || !estilo) return;
    setGenerando(true);
    // Simula el "armado con IA" (Fase 1 = demo). Aquí entrará Claude después.
    setTimeout(() => {
      const sitio = generarSitio({
        nombreNegocio: nombre,
        giro,
        estilo,
        descripcionNegocio: descripcion,
        whatsapp,
      });
      guardarSitio(sitio);
      router.push(`/dashboard/${sitio.id}`);
    }, 1600);
  }

  if (generando) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
        <h1 className="mt-6 text-2xl font-bold text-ink">Armando tu página…</h1>
        <p className="mt-2 text-muted">Generando textos, secciones y diseño ✨</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-50/40">
      <div className="container-tv max-w-2xl py-8">
        <Link href="/" className="text-sm font-medium text-muted hover:text-ink">
          ← Telovendo
        </Link>

        {/* Progreso */}
        <div className="mt-6 flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < paso ? "bg-brand-500" : "bg-brand-200"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">
          Paso {paso} de {total}
        </p>

        {/* Paso 1: giro */}
        {paso === 1 && (
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-ink">¿Qué tipo de negocio tienes?</h1>
            <p className="mt-2 text-muted">Elige el giro que mejor te describa.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {GIROS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGiro(g.id)}
                  className={`rounded-card border-2 bg-white p-5 text-left transition ${
                    giro === g.id
                      ? "border-brand-500 shadow-glow"
                      : "border-transparent shadow-card hover:border-brand-200"
                  }`}
                >
                  <div className="text-3xl">{g.emoji}</div>
                  <div className="mt-2 font-semibold text-ink">{g.nombre}</div>
                  <div className="text-sm text-muted">{g.ejemplos}</div>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <button
                disabled={!giro}
                onClick={() => setPaso(2)}
                className="btn-primary disabled:opacity-40"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: estilo */}
        {paso === 2 && (
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-ink">Elige un estilo</h1>
            <p className="mt-2 text-muted">Lo podrás cambiar después.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {ESTILOS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEstilo(e.id)}
                  className={`overflow-hidden rounded-card border-2 bg-white text-left transition ${
                    estilo === e.id
                      ? "border-brand-500 shadow-glow"
                      : "border-transparent shadow-card hover:border-brand-200"
                  }`}
                >
                  <div className="flex h-20 items-center gap-2 px-5" style={{ background: e.tema.fondo }}>
                    <span className="h-8 w-8 rounded-full" style={{ background: e.tema.primario }} />
                    <span className="h-8 w-8 rounded-full" style={{ background: e.tema.acento }} />
                  </div>
                  <div className="p-5">
                    <div className="font-semibold text-ink">{e.nombre}</div>
                    <div className="text-sm text-muted">{e.descripcion}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setPaso(1)} className="btn-ghost">
                ← Atrás
              </button>
              <button
                disabled={!estilo}
                onClick={() => setPaso(3)}
                className="btn-primary disabled:opacity-40"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: datos */}
        {paso === 3 && (
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-ink">Cuéntanos de tu negocio</h1>
            <p className="mt-2 text-muted">Con esto la IA arma tu contenido.</p>
            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">
                  Nombre del negocio
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Taquería El Güero"
                  className="w-full rounded-card border border-brand-200 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">
                  ¿Qué vendes u ofreces?
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Tacos al pastor, gringas y quesadillas con tortilla hecha a mano."
                  rows={3}
                  className="w-full rounded-card border border-brand-200 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">
                  WhatsApp (con lada, 10 dígitos)
                </label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ej. 5512345678"
                  inputMode="numeric"
                  className="w-full rounded-card border border-brand-200 px-4 py-3 outline-none focus:border-brand-500"
                />
                <p className="mt-1 text-xs text-muted">
                  Tus clientes te escribirán aquí. Lo puedes cambiar después.
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setPaso(2)} className="btn-ghost">
                ← Atrás
              </button>
              <button
                disabled={!nombre.trim()}
                onClick={generar}
                className="btn-primary disabled:opacity-40"
              >
                ✨ Generar mi página
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
