"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function Header() {
  const { itemCount } = useCart();
  return (
    <header className="sticky top-0 z-20 bg-hec-navy text-white shadow-sm">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">🎓</span>
          <span className="text-sm sm:text-base">HEC Campus Delivery</span>
        </Link>
        <Link
          href="/cart"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          aria-label="Carrito"
        >
          <span className="text-xl">🛒</span>
          {itemCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-hec-gold px-1 text-xs font-bold text-hec-navy">
              {itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
