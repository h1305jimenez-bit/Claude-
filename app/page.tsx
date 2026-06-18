import Link from "next/link";
import {
  CameraIcon,
  HomeIcon,
  SparklesIcon,
  ShieldIcon,
  TruckIcon,
  UploadIcon,
  WalletIcon,
} from "@/components/icons";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/90 backdrop-blur">
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
          <span className="inline-flex items-center gap-2 rounded-pill bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700">
            <CameraIcon className="h-4 w-4" /> Vende sin complicarte
          </span>
          <h1 className="mx-auto mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-6xl">
            Toma una foto.<br />
            <span className="text-brand-500">Nosotros lo vendemos</span> por ti.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            Sube una foto y la inteligencia artificial identifica qué es y le
            pone precio. Tú eliges, y nosotros nos encargamos de todo lo demás.
          </p>

          {/* Puntos fuertes */}
          <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-card border border-brand-100 bg-white p-4 text-left shadow-card">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">
                <WalletIcon className="h-6 w-6" />
              </span>
              <div>
                <div className="font-bold text-ink">Te pagamos al venderse</div>
                <div className="text-sm text-muted">En cuanto se vende, tu dinero a tu cuenta.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-card border border-brand-100 bg-white p-4 text-left shadow-card">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                <HomeIcon className="h-6 w-6" />
              </span>
              <div>
                <div className="font-bold text-ink">Vamos por él a tu casa</div>
                <div className="text-sm text-muted">No te mueves. Lo recogemos en tu domicilio.</div>
              </div>
            </div>
          </div>

          <div className="mt-9">
            <Link href="/vender" className="btn-primary text-lg">
              <CameraIcon className="h-5 w-5" /> Subir foto y vender
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            Gratis subir · Solo pagas 15% cuando se vende
          </p>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="container-tv max-w-4xl py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { n: 1, Icon: UploadIcon, t: "Sube la foto", d: "Una foto de tu producto, desde tu celular." },
            { n: 2, Icon: SparklesIcon, t: "La IA hace el trabajo", d: "Identifica qué es y te sugiere 3 precios. Tú eliges." },
            { n: 3, Icon: TruckIcon, t: "Nosotros vendemos", d: "Lo publicamos, recogemos en tu casa y entregamos. Te depositamos tu dinero." },
          ].map(({ n, Icon, t, d }) => (
            <div key={n} className="relative rounded-card border border-brand-100 bg-white p-6 shadow-card">
              <span className="absolute right-4 top-4 text-sm font-bold text-brand-200">0{n}</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{t}</h3>
              <p className="mt-1 text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sin riesgo */}
      <section className="container-tv max-w-3xl py-12">
        <div className="rounded-card bg-brand-500 px-8 py-12 text-center shadow-glow">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white">
            <ShieldIcon className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-white">Primero te pagamos</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Cuando tu producto se vende, te depositamos el 85% a tu cuenta y{" "}
            <strong className="text-white">apenas entonces</strong> pasamos por
            él a tu casa para entregarlo al cliente. Cero riesgo: nunca sueltas
            tu producto sin tener tu dinero.
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
          © {new Date().getFullYear()} Telovendo · telovendo.mx · Hecho en México
        </div>
      </footer>
    </main>
  );
}
