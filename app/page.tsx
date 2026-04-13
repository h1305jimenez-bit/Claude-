import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-hec-navy p-6 text-white">
        <h1 className="text-2xl font-bold leading-tight">
          Hey HECien 👋
        </h1>
        <p className="mt-1 text-sm text-white/80">
          Order your groceries from Auchan or book laundry right to your dorm.
          Fast Revolut checkout.
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
              Auchan groceries
            </h2>
            <p className="text-sm text-slate-600">
              Supermarket shopping delivered to your dorm in under 2 h.
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
              Campus laundry
            </h2>
            <p className="text-sm text-slate-600">
              We pick up your clothes at your dorm. Wash, dry and iron.
            </p>
          </div>
          <span className="text-xl text-slate-400">›</span>
        </Link>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        <h3 className="mb-1 font-semibold text-slate-700">How it works</h3>
        <ol className="list-inside list-decimal space-y-1">
          <li>Pick the service you need.</li>
          <li>Add products or choose a laundry service.</li>
          <li>Tell us your dorm, building letter and preferred time.</li>
          <li>
            Pay with <span className="font-semibold text-[#0666EB]">Revolut</span>{" "}
            in one click.
          </li>
          <li>We pick it up and deliver to your door.</li>
        </ol>
      </section>
    </div>
  );
}
