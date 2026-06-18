"use client";

import type { ItemCarrito, Pedido, Producto, Sitio } from "./types";

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

// ----------------- Carrito -----------------

const KEY_CARRITO = "telovendo:carrito:v1";

export function leerCarrito(): ItemCarrito[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_CARRITO);
    return raw ? (JSON.parse(raw) as ItemCarrito[]) : [];
  } catch {
    return [];
  }
}

function escribirCarrito(items: ItemCarrito[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_CARRITO, JSON.stringify(items));
  window.dispatchEvent(new Event("carrito-actualizado"));
}

export function agregarAlCarrito(item: Omit<ItemCarrito, "cantidad">, cantidad = 1): void {
  const items = leerCarrito();
  const existente = items.find(
    (i) => i.productoId === item.productoId && i.tipo === item.tipo
  );
  if (existente) existente.cantidad += cantidad;
  else items.push({ ...item, cantidad });
  escribirCarrito(items);
}

export function cambiarCantidad(productoId: string, tipo: ItemCarrito["tipo"], cantidad: number): void {
  let items = leerCarrito();
  const it = items.find((i) => i.productoId === productoId && i.tipo === tipo);
  if (it) it.cantidad = cantidad;
  items = items.filter((i) => i.cantidad > 0);
  escribirCarrito(items);
}

export function quitarDelCarrito(productoId: string, tipo: ItemCarrito["tipo"]): void {
  escribirCarrito(leerCarrito().filter((i) => !(i.productoId === productoId && i.tipo === tipo)));
}

export function vaciarCarrito(): void {
  escribirCarrito([]);
}

export function totalCarrito(items: ItemCarrito[] = leerCarrito()): number {
  return items.reduce((s, i) => s + i.precio * i.cantidad, 0);
}

export function conteoCarrito(items: ItemCarrito[] = leerCarrito()): number {
  return items.reduce((s, i) => s + i.cantidad, 0);
}

// ----------------- Pedidos -----------------

const KEY_PEDIDOS = "telovendo:pedidos:v1";

export function listarPedidos(): Pedido[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_PEDIDOS);
    const todos = raw ? (JSON.parse(raw) as Pedido[]) : [];
    return todos.sort((a, b) => b.creadoEn - a.creadoEn);
  } catch {
    return [];
  }
}

export function obtenerPedido(folio: string): Pedido | undefined {
  return listarPedidos().find((p) => p.folio === folio);
}

export function guardarPedido(pedido: Pedido): void {
  if (typeof window === "undefined") return;
  const todos = listarPedidos();
  const i = todos.findIndex((p) => p.id === pedido.id);
  if (i >= 0) todos[i] = pedido;
  else todos.push(pedido);
  window.localStorage.setItem(KEY_PEDIDOS, JSON.stringify(todos));
}

export function cambiarEstadoPedido(id: string, estado: Pedido["estado"]): void {
  const todos = listarPedidos();
  const p = todos.find((x) => x.id === id);
  if (p) {
    p.estado = estado;
    window.localStorage.setItem(KEY_PEDIDOS, JSON.stringify(todos));
  }
}
