import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-hec-navy p-6 text-white">
        <h1 className="text-2xl font-bold leading-tight">
          Hola HECien 👋
        </h1>
        <p className="mt-1 text-sm text-white/80">
          Pide tu despensa al Auchan o solicita lavandería a domicilio en el
          campus. Pago rápido por Revolut.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <Link
          href="/auchan"
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition active:scale-[0.99]"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-4xl">
            🛒
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-hec-navy">
              Despensa Auchan
            </h2>
            <p className="text-sm text-slate-600">
              Compra del supermercado entregada en tu dorm en menos de 2 h.
            </p>
          </div>
          <span className="text-xl text-slate-400">›</span>
        </Link>

        <Link
          href="/laundry"
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition active:scale-[0.99]"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-4xl">
            🧺
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-hec-navy">
              Lavandería en el campus
            </h2>
            <p className="text-sm text-slate-600">
              Pasamos a recoger tu ropa por el dorm. Lavado, secado y planchado.
            </p>
          </div>
          <span className="text-xl text-slate-400">›</span>
        </Link>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        <h3 className="mb-1 font-semibold text-slate-700">¿Cómo funciona?</h3>
        <ol className="list-inside list-decimal space-y-1">
          <li>Elige el servicio que necesitas.</li>
          <li>Añade productos o selecciona lavandería.</li>
          <li>Indica tu dorm y hora preferida.</li>
          <li>
            Paga con <span className="font-semibold text-[#0666EB]">Revolut</span>{" "}
            en un clic.
          </li>
          <li>Recibimos tu pedido y lo entregamos en tu puerta.</li>
        </ol>
      </section>
    </div>
  );
}
