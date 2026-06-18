"use client";

import type { Producto, Sitio } from "./types";

// Persistencia del MVP en localStorage. Las funciones replican la API que
// tendrá el cliente de Supabase (listar / obtener / guardar / borrar), así
// que migrar a la base de datos no cambia las pantallas.

const KEY = "telovendo:sitios:v1";

function leerTodos(): Sitio[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Sitio[]) : [];
  } catch {
    return [];
  }
}

function escribirTodos(sitios: Sitio[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(sitios));
}

export function listarSitios(): Sitio[] {
  return leerTodos().sort((a, b) => b.creadoEn - a.creadoEn);
}

export function obtenerSitio(id: string): Sitio | undefined {
  return leerTodos().find((s) => s.id === id);
}

export function obtenerSitioPorSlug(slug: string): Sitio | undefined {
  return leerTodos().find((s) => s.slug === slug);
}

export function guardarSitio(sitio: Sitio): void {
  const todos = leerTodos();
  const i = todos.findIndex((s) => s.id === sitio.id);
  if (i >= 0) todos[i] = sitio;
  else todos.push(sitio);
  escribirTodos(todos);
}

export function borrarSitio(id: string): void {
  escribirTodos(leerTodos().filter((s) => s.id !== id));
}

// Productos listados en el marketplace de Telovendo (de todos los negocios).
export interface ProductoMarketplace extends Producto {
  sitioId: string;
  negocio: string;
  slug: string;
}

export function listarMarketplace(): ProductoMarketplace[] {
  const out: ProductoMarketplace[] = [];
  for (const s of leerTodos()) {
    for (const p of s.productos) {
      if (p.enMarketplace) {
        out.push({ ...p, sitioId: s.id, negocio: s.nombreNegocio, slug: s.slug });
      }
    }
  }
  return out;
}
