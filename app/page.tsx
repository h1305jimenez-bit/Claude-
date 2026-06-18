import Link from "next/link";
import Navbar from "@/components/Navbar";
import { GIROS } from "@/lib/templates";

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-200 opacity-40 blur-3xl" />
        <div className="container-tv relative py-20 text-center sm:py-28">
          <span className="chip">🚀 Tu negocio en línea en segundos</span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-6xl">
            Crea la <span className="text-brand-500">página y tienda</span> de tu
            negocio en segundos
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Describe tu negocio y la inteligencia artificial arma tu página
            profesional. ¿No quieres tienda propia? Sube tu producto a nuestro
            marketplace y <strong className="text-ink">nosotros lo vendemos por ti</strong>.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/crear" className="btn-primary">
              Crear mi página gratis →
            </Link>
            <Link href="/marketplace" className="btn-ghost">
              Ver el marketplace
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            Sin tarjeta · Sin conocimientos técnicos · Listo en minutos
          </p>
        </div>
      </section>

      {/* Dos caminos */}
      <section className="container-tv py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-card border border-brand-100 bg-white p-8 shadow-card">
            <div className="text-3xl">🏪</div>
            <h2 className="mt-4 text-2xl font-bold text-ink">Tu propia tienda</h2>
            <p className="mt-2 text-muted">
              Tu página con tu marca, tu catálogo y tu botón de WhatsApp.
              Cobra con tarjeta, SPEI u OXXO. Tú tienes el control total.
            </p>
            <Link href="/crear" className="mt-5 inline-block font-semibold text-brand-600">
              Crear mi tienda →
            </Link>
          </div>
          <div className="rounded-card border border-accent-400/30 bg-accent-500/5 p-8 shadow-card">
            <div className="text-3xl">📦</div>
            <h2 className="mt-4 text-2xl font-bold text-ink">Te lo vendemos</h2>
            <p className="mt-2 text-muted">
              ¿Solo quieres vender? Súbelo al marketplace. Cuando se venda,{" "}
              <strong>primero te pagamos</strong> y luego pasamos a tu casa por
              el producto para entregarlo al cliente. Tú no te preocupas por nada.
            </p>
            <Link href="/marketplace" className="mt-5 inline-block font-semibold text-accent-600">
              Conocer el marketplace →
            </Link>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="container-tv py-16">
        <h2 className="text-center text-3xl font-bold text-ink">
          Así de fácil
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { n: "1", t: "Cuéntanos de tu negocio", d: "Elige tu giro, un estilo y describe en una frase qué vendes." },
            { n: "2", t: "La IA arma tu página", d: "En segundos generamos textos, secciones y diseño. Tú solo ajustas." },
            { n: "3", t: "Publica y vende", d: "Comparte tu link, recibe pedidos por WhatsApp y cobra en línea." },
          ].map((p) => (
            <div key={p.n} className="rounded-card bg-brand-50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 font-bold text-white">
                {p.n}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{p.t}</h3>
              <p className="mt-1 text-muted">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Giros */}
      <section className="container-tv py-12">
        <h2 className="text-center text-2xl font-bold text-ink">
          Para cualquier tipo de negocio
        </h2>
        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3">
          {GIROS.map((g) => (
            <span key={g.id} className="chip text-base">
              <span className="text-xl">{g.emoji}</span> {g.nombre}
            </span>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="container-tv py-16">
        <div className="rounded-card bg-brand-500 px-8 py-14 text-center shadow-glow">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Empieza a vender hoy
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Miles de pymes mexicanas ya están en línea. Tu negocio es el siguiente.
          </p>
          <Link
            href="/crear"
            className="mt-7 inline-block rounded-pill bg-white px-7 py-3 font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Crear mi página gratis
          </Link>
        </div>
      </section>

      <footer className="border-t border-brand-100 py-8">
        <div className="container-tv flex flex-col items-center justify-between gap-3 text-sm text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Telovendo · telovendo.mx</span>
          <span>Hecho en México 🇲🇽 para las pymes</span>
        </div>
      </footer>
    </>
  );
}
