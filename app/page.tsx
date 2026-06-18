import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-brand-100">
        <div className="container-tv flex items-center justify-between py-4">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-lg font-black text-white">
              T
            </span>
            <span className="text-xl font-extrabold tracking-tight text-ink">
              Telo<span className="text-brand-500">vendo</span>
            </span>
          </span>
          <Link href="/vender" className="btn-primary px-5 py-2 text-sm">
            Vender ahora
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-200 opacity-40 blur-3xl" />
        <div className="container-tv relative max-w-3xl py-20 text-center sm:py-28">
          <span className="chip">📸 Vende sin complicarte</span>
          <h1 className="mx-auto mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-6xl">
            Toma una foto.<br />
            <span className="text-brand-500">Nosotros lo vendemos</span> por ti.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            Sube la foto de lo que quieras vender. La inteligencia artificial
            identifica qué es y te sugiere el precio. Tú eliges y nosotros nos
            encargamos de todo lo demás: lo vendemos, lo recogemos en tu casa y
            lo entregamos al cliente.
          </p>
          <div className="mt-9">
            <Link href="/vender" className="btn-primary text-lg">
              📷 Subir foto y vender
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">Gratis subir · Solo pagas 15% cuando se vende</p>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="container-tv max-w-4xl py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { n: "1", e: "📤", t: "Sube la foto", d: "Una foto de tu producto, desde tu celular." },
            { n: "2", e: "🤖", t: "La IA hace el trabajo", d: "Identifica qué es y te sugiere 3 precios. Tú eliges." },
            { n: "3", e: "🚚", t: "Nosotros vendemos", d: "Lo publicamos, recogemos en tu casa y entregamos. Te depositamos tu dinero." },
          ].map((s) => (
            <div key={s.n} className="rounded-card bg-brand-50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 font-bold text-white">
                {s.n}
              </div>
              <div className="mt-4 text-3xl">{s.e}</div>
              <h3 className="mt-2 text-lg font-semibold text-ink">{s.t}</h3>
              <p className="mt-1 text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sin riesgo */}
      <section className="container-tv max-w-3xl py-12">
        <div className="rounded-card bg-brand-500 px-8 py-12 text-center shadow-glow">
          <h2 className="text-3xl font-bold text-white">Vende sin riesgo</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            No te mueves de casa. Cuando tu producto se vende, te depositamos el
            85% y apenas entonces pasamos por él. Tú no te preocupas por nada.
          </p>
          <Link
            href="/vender"
            className="mt-7 inline-block rounded-pill bg-white px-7 py-3 font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Empezar ahora
          </Link>
        </div>
      </section>

      <footer className="border-t border-brand-100 py-8">
        <div className="container-tv text-center text-sm text-muted">
          © {new Date().getFullYear()} Telovendo · telovendo.mx · Hecho en México 🇲🇽
        </div>
      </footer>
    </main>
  );
}
