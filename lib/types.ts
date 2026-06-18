// Modelo de datos de Telovendo (MVP).
// En la Fase 1 persistimos en localStorage; estos tipos son el contrato
// que luego mapeará a tablas de Supabase sin cambiar la forma de los datos.

export type GiroId =
  | "comida"
  | "belleza"
  | "servicios"
  | "tienda"
  | "salud"
  | "otro";

export type EstiloId = "moderno" | "calido" | "minimal" | "vibrante";

export interface Tema {
  primario: string; // color principal (hex)
  acento: string; // color de acento (hex)
  fondo: string; // color de fondo
  texto: string; // color de texto
}

// --- Secciones de la página ---
export type SeccionTipo =
  | "hero"
  | "servicios"
  | "productos"
  | "galeria"
  | "testimonios"
  | "contacto";

export interface SeccionBase {
  id: string;
  tipo: SeccionTipo;
  visible: boolean;
}

export interface HeroSeccion extends SeccionBase {
  tipo: "hero";
  titulo: string;
  subtitulo: string;
  cta: string;
}

export interface ItemServicio {
  titulo: string;
  descripcion: string;
  emoji: string;
}

export interface ServiciosSeccion extends SeccionBase {
  tipo: "servicios";
  titulo: string;
  items: ItemServicio[];
}

export interface ProductosSeccion extends SeccionBase {
  tipo: "productos";
  titulo: string;
}

export interface GaleriaSeccion extends SeccionBase {
  tipo: "galeria";
  titulo: string;
  emojis: string[];
}

export interface Testimonio {
  nombre: string;
  texto: string;
}

export interface TestimoniosSeccion extends SeccionBase {
  tipo: "testimonios";
  titulo: string;
  items: Testimonio[];
}

export interface ContactoSeccion extends SeccionBase {
  tipo: "contacto";
  titulo: string;
  direccion: string;
  horario: string;
}

export type Seccion =
  | HeroSeccion
  | ServiciosSeccion
  | ProductosSeccion
  | GaleriaSeccion
  | TestimoniosSeccion
  | ContactoSeccion;

// --- Producto (tienda y/o marketplace) ---
export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number; // MXN
  emoji: string; // imagen-placeholder para el MVP
  enMarketplace: boolean; // si se vende también en el marketplace de Telovendo
}

// --- Sitio de un negocio ---
export interface Sitio {
  id: string;
  slug: string;
  nombreNegocio: string;
  giro: GiroId;
  estilo: EstiloId;
  descripcionNegocio: string;
  whatsapp: string;
  tema: Tema;
  secciones: Seccion[];
  tiendaActiva: boolean;
  productos: Producto[];
  creadoEn: number;
}
