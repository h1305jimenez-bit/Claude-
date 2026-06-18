import type { Sitio } from "@/lib/types";

function mxn(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function waLink(numero: string, mensaje: string): string {
  const n = numero.replace(/[^0-9]/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}`;
}

export default function SiteRenderer({ sitio }: { sitio: Sitio }) {
  const t = sitio.tema;
  const wa = sitio.whatsapp
    ? waLink(sitio.whatsapp, `Hola ${sitio.nombreNegocio}, vi su página y me interesa.`)
    : null;

  return (
    <div style={{ background: t.fondo, color: t.texto }} className="min-h-full">
      {/* Barra superior del negocio */}
      <header
        className="sticky top-0 z-10 backdrop-blur"
        style={{ background: `${t.fondo}cc`, borderBottom: `1px solid ${t.primario}22` }}
      >
        <div className="container-tv flex items-center justify-between py-4">
          <span className="text-lg font-bold" style={{ color: t.primario }}>
            {sitio.nombreNegocio}
          </span>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="rounded-pill px-4 py-2 text-sm font-semibold text-white"
              style={{ background: t.primario }}
            >
              WhatsApp
            </a>
          )}
        </div>
      </header>

      {sitio.secciones
        .filter((s) => s.visible)
        .map((s) => {
          switch (s.tipo) {
            case "hero":
              return (
                <section key={s.id} className="container-tv py-20 text-center">
                  <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
                    {s.titulo}
                  </h1>
                  <p className="mx-auto mt-5 max-w-2xl text-lg" style={{ color: t.texto, opacity: 0.75 }}>
                    {s.subtitulo}
                  </p>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-8 inline-block rounded-pill px-7 py-3 font-semibold text-white"
                      style={{ background: t.primario }}
                    >
                      {s.cta}
                    </a>
                  )}
                </section>
              );

            case "servicios":
              return (
                <section key={s.id} className="container-tv py-14">
                  <h2 className="mb-8 text-center text-3xl font-bold">{s.titulo}</h2>
                  <div className="grid gap-5 sm:grid-cols-3">
                    {s.items.map((it, i) => (
                      <div
                        key={i}
                        className="rounded-card p-6 text-center"
                        style={{ background: `${t.primario}0d` }}
                      >
                        <div className="text-4xl">{it.emoji}</div>
                        <h3 className="mt-3 text-lg font-semibold">{it.titulo}</h3>
                        <p className="mt-1 text-sm" style={{ opacity: 0.7 }}>
                          {it.descripcion}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              );

            case "productos":
              if (!sitio.tiendaActiva || sitio.productos.length === 0) return null;
              return (
                <section key={s.id} className="container-tv py-14">
                  <h2 className="mb-8 text-center text-3xl font-bold">{s.titulo}</h2>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {sitio.productos.map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-card" style={{ border: `1px solid ${t.primario}22` }}>
                        <div
                          className="flex h-40 items-center justify-center text-6xl"
                          style={{ background: `${t.primario}0d` }}
                        >
                          {p.emoji}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold">{p.nombre}</h3>
                            <span className="whitespace-nowrap font-bold" style={{ color: t.primario }}>
                              {mxn(p.precio)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm" style={{ opacity: 0.7 }}>
                            {p.descripcion}
                          </p>
                          {wa && (
                            <a
                              href={waLink(sitio.whatsapp, `Hola, quiero pedir: ${p.nombre} (${mxn(p.precio)})`)}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 block rounded-pill py-2 text-center text-sm font-semibold text-white"
                              style={{ background: t.primario }}
                            >
                              Pedir por WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );

            case "galeria":
              return (
                <section key={s.id} className="container-tv py-14">
                  <h2 className="mb-8 text-center text-3xl font-bold">{s.titulo}</h2>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {s.emojis.map((e, i) => (
                      <div
                        key={i}
                        className="flex aspect-square items-center justify-center rounded-card text-5xl"
                        style={{ background: `${t.acento}1a` }}
                      >
                        {e}
                      </div>
                    ))}
                  </div>
                </section>
              );

            case "testimonios":
              return (
                <section key={s.id} className="py-14" style={{ background: `${t.primario}0a` }}>
                  <div className="container-tv">
                    <h2 className="mb-8 text-center text-3xl font-bold">{s.titulo}</h2>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {s.items.map((it, i) => (
                        <div key={i} className="rounded-card bg-white p-6 shadow-card">
                          <p className="text-lg" style={{ color: "#15131f" }}>
                            “{it.texto}”
                          </p>
                          <p className="mt-3 font-semibold" style={{ color: t.primario }}>
                            {it.nombre}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );

            case "contacto":
              return (
                <section key={s.id} className="container-tv py-16 text-center">
                  <h2 className="text-3xl font-bold">{s.titulo}</h2>
                  <p className="mt-3 text-lg" style={{ opacity: 0.75 }}>
                    📍 {s.direccion}
                  </p>
                  <p className="mt-1 text-lg" style={{ opacity: 0.75 }}>
                    🕒 {s.horario}
                  </p>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-block rounded-pill px-7 py-3 font-semibold text-white"
                      style={{ background: t.primario }}
                    >
                      Escríbenos por WhatsApp
                    </a>
                  )}
                </section>
              );

            default:
              return null;
          }
        })}

      <footer className="container-tv py-10 text-center text-sm" style={{ opacity: 0.6 }}>
        {sitio.nombreNegocio} · Hecho con Telovendo
      </footer>

      {/* Botón flotante de WhatsApp */}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className="fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-lg"
          style={{ background: "#25D366" }}
        >
          💬
        </a>
      )}
    </div>
  );
}
