import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-hec-navy p-6 text-white shadow-card">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-hec-gold/20 blur-3xl"
        />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-hec-gold">
            HEC Paris · Campus delivery
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight">
            Hey HECien 👋
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Order from the Auchan across the street, or book laundry to your
            dorm. Pay in one tap with Revolut.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <Link
          href="/auchan"
          className="group flex items-center gap-4 rounded-2xl border border-hec-stone bg-white p-5 shadow-card transition hover:border-hec-navy"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-hec-sand text-4xl">
            🛒
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-hec-navy">
              Auchan groceries
            </h2>
            <p className="text-sm text-slate-600">
              From the Auchan right in front of campus. Dropped at your dorm
              in under 2 h.
            </p>
          </div>
          <span className="text-xl text-hec-navy/30 transition group-hover:text-hec-navy">
            ›
          </span>
        </Link>

        <Link
          href="/laundry"
          className="group flex items-center gap-4 rounded-2xl border border-hec-stone bg-white p-5 shadow-card transition hover:border-hec-navy"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-hec-gold-soft text-4xl">
            🧺
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-hec-navy">
              Campus laundry
            </h2>
            <p className="text-sm text-slate-600">
              Wash for 3 €/kg or dry for 2 €/kg. Pickup at your building.
            </p>
          </div>
          <span className="text-xl text-hec-navy/30 transition group-hover:text-hec-navy">
            ›
          </span>
        </Link>

        <Link
          href="/election"
          className="group flex items-center gap-4 rounded-2xl border border-hec-stone bg-white p-5 shadow-card transition hover:border-hec-navy"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-hec-navy/10 text-4xl">
            🗳️
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-hec-navy">
              MBA Elections
            </h2>
            <p className="text-sm text-slate-600">
              Vote for your MBA 2025 class representatives.
            </p>
          </div>
          <span className="text-xl text-hec-navy/30 transition group-hover:text-hec-navy">
            ›
          </span>
        </Link>
      </section>

      <section className="rounded-2xl border border-dashed border-hec-stone p-4 text-sm text-slate-600">
        <h3 className="mb-1 font-semibold text-hec-navy">How it works</h3>
        <ol className="list-inside list-decimal space-y-1">
          <li>Sign in with your @hec.edu email.</li>
          <li>Pick the service and add items.</li>
          <li>Tell us your building letter, room and preferred slot.</li>
          <li>
            Pay with <span className="font-semibold text-revolut-blue">Revolut</span>{" "}
            in one click.
          </li>
          <li>We drop off at your door.</li>
        </ol>
      </section>
    </div>
  );
}
