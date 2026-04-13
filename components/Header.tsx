"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./CartProvider";

export function Header({ email }: { email: string | null }) {
  const { itemCount } = useCart();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMenuOpen(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-hec-blue/30 bg-hec-navy text-white">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">
            HEC Campus Delivery
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Cart"
          >
            <span className="text-lg">🛒</span>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-hec-gold px-1 text-xs font-bold text-hec-navy">
                {itemCount}
              </span>
            )}
          </Link>
          {email && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-hec-gold font-bold text-hec-navy"
                aria-label="Account"
              >
                {email[0]?.toUpperCase()}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl bg-white text-hec-ink shadow-card">
                  <div className="border-b border-hec-stone px-4 py-3 text-xs text-slate-600">
                    Signed in as
                    <div className="mt-0.5 truncate text-sm font-medium text-hec-navy">
                      {email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm text-hec-burgundy hover:bg-hec-ivory"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
