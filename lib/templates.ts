import type { EstiloId, GiroId, Tema } from "./types";

export interface GiroDef {
  id: GiroId;
  nombre: string;
  emoji: string;
  ejemplos: string;
}

export const GIROS: GiroDef[] = [
  { id: "comida", nombre: "Comida y bebida", emoji: "🌮", ejemplos: "Taquería, cafetería, fonda, repostería" },
  { id: "belleza", nombre: "Belleza y estética", emoji: "💇", ejemplos: "Salón, barbería, uñas, spa" },
  { id: "servicios", nombre: "Servicios", emoji: "🔧", ejemplos: "Taller, plomería, limpieza, clases" },
  { id: "tienda", nombre: "Tienda y productos", emoji: "🛍️", ejemplos: "Boutique, abarrotes, artesanías" },
  { id: "salud", nombre: "Salud y bienestar", emoji: "🩺", ejemplos: "Consultorio, dentista, gimnasio" },
  { id: "otro", nombre: "Otro", emoji: "✨", ejemplos: "Cualquier otro negocio" },
];

export interface EstiloDef {
  id: EstiloId;
  nombre: string;
  descripcion: string;
  tema: Tema;
}

export const ESTILOS: EstiloDef[] = [
  {
    id: "moderno",
    nombre: "Moderno",
    descripcion: "Limpio, profesional, tonos morados.",
    tema: { primario: "#6d3bff", acento: "#ff9500", fondo: "#ffffff", texto: "#15131f" },
  },
  {
    id: "calido",
    nombre: "Cálido",
    descripcion: "Acogedor, ideal para comida y belleza.",
    tema: { primario: "#e0552b", acento: "#f2a93b", fondo: "#fffaf3", texto: "#2a1a12" },
  },
  {
    id: "minimal",
    nombre: "Minimal",
    descripcion: "Blanco y negro, elegante y sobrio.",
    tema: { primario: "#15131f", acento: "#6d6780", fondo: "#ffffff", texto: "#15131f" },
  },
  {
    id: "vibrante",
    nombre: "Vibrante",
    descripcion: "Colores fuertes, juvenil y llamativo.",
    tema: { primario: "#0ea5a3", acento: "#ff3d81", fondo: "#f5fffe", texto: "#0c2b2a" },
  },
];

export function giroDef(id: GiroId): GiroDef {
  return GIROS.find((g) => g.id === id) ?? GIROS[GIROS.length - 1];
}

export function estiloDef(id: EstiloId): EstiloDef {
  return ESTILOS.find((e) => e.id === id) ?? ESTILOS[0];
}
