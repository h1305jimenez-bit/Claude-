"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { conteoCarrito, leerCarrito } from "@/lib/store";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  primary?: boolean;
}

const NAV: NavItem[] = [
  { href: "/crear", label: "Crear sitio", icon: "✨", primary: true },
  { href: "/dashboard", label: "Mis sitios", icon: "🏪" },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: "📋" },
  { href: "/marketplace", label: "Marketplace", icon: "📦" },
  { href: "/", label: "Inicio", icon: "🏠" },
];

function CarritoLink({ onNavigate }: { onNavigate?: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const sync = () => setN(conteoCarrito(leerCarrito()));
    sync();
    window.addEventListener("carrito-actualizado", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("carrito-actualizado", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  if (n === 0) return null;
  return (
    <Link
      href="/checkout"
      onClick={onNavigate}
      className="flex items-center justify-between rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
    >
      <span className="flex items-center gap-2">
        <span className="text-lg">🛒</span> Carrito
      </span>
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs text-white">
        {n}
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) =>
        item.primary ? (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="mb-2 flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2.5 font-semibold text-white transition hover:bg-brand-600"
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive(item.href)
                ? "bg-brand-100 text-brand-700"
                : "text-ink hover:bg-black/5"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 px-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-lg font-black text-white">
        T
      </span>
      <span className="text-xl font-extrabold tracking-tight text-ink">
        Telo<span className="text-brand-500">vendo</span>
      </span>
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar fijo (desktop) — estilo ChatGPT */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-black/5 bg-[#f7f7f8] p-3 md:flex">
        <div className="pt-2">
          <Logo />
        </div>
        <NavList />
        <div className="mt-auto flex flex-col gap-3">
          <CarritoLink />
          <div className="px-1 text-xs text-muted">
            © {new Date().getFullYear()} Telovendo · telovendo.mx
          </div>
        </div>
      </aside>

      {/* Barra superior (móvil) con botón de menú */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-black/5"
          >
            <span className="text-2xl leading-none">☰</span>
          </button>
          <Logo />
          <span className="w-10" />
        </header>

        <div className="min-w-0 flex-1">{children}</div>
      </div>

      {/* Cajón (drawer) móvil */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col gap-6 bg-[#f7f7f8] p-3 shadow-xl">
            <div className="flex items-center justify-between pt-2">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-black/5"
              >
                ✕
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <div className="mt-auto">
              <CarritoLink onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
