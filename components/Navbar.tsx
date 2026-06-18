import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/80 backdrop-blur">
      <div className="container-tv flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-lg font-black text-white">
            T
          </span>
          <span className="text-xl font-extrabold tracking-tight text-ink">
            Telo<span className="text-brand-500">vendo</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/marketplace"
            className="hidden text-sm font-medium text-muted hover:text-ink sm:block"
          >
            Marketplace
          </Link>
          <Link
            href="/dashboard"
            className="hidden text-sm font-medium text-muted hover:text-ink sm:block"
          >
            Mis sitios
          </Link>
          <Link href="/crear" className="btn-primary px-5 py-2 text-sm">
            Crear mi página
          </Link>
        </nav>
      </div>
    </header>
  );
}
