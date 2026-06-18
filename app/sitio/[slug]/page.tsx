"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SiteRenderer from "@/components/SiteRenderer";
import { obtenerSitioPorSlug } from "@/lib/store";
import type { Sitio } from "@/lib/types";

export default function SitioPublicoPage() {
  const params = useParams<{ slug: string }>();
  const [sitio, setSitio] = useState<Sitio | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    setSitio(obtenerSitioPorSlug(params.slug) ?? null);
    setCargado(true);
  }, [params.slug]);

  if (cargado && !sitio) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <div className="text-5xl">🔍</div>
        <h1 className="mt-4 text-2xl font-bold text-ink">Esta página no existe</h1>
        <p className="mt-2 text-muted">
          El sitio que buscas no fue encontrado en este navegador.
        </p>
        <Link href="/" className="btn-primary mt-6">
          Ir a Telovendo
        </Link>
      </main>
    );
  }
  if (!sitio) return null;

  return <SiteRenderer sitio={sitio} />;
}
