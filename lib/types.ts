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
export type CondicionProducto = "nuevo" | "usado" | "hecho_a_mano";
export type TamanoProducto = "chico" | "mediano" | "grande";

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number; // MXN — precio de venta (lo que paga el cliente)
  emoji: string; // imagen-placeholder para el MVP
  enMarketplace: boolean; // si se vende también en el marketplace de Telovendo
  // Datos extra para el marketplace (Telovendo recoge, vende y entrega):
  condicion?: CondicionProducto;
  inventario?: number; // unidades disponibles
  tamano?: TamanoProducto; // para planear la recolección y entrega
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
  // Datos del vendedor para el marketplace:
  recoleccion?: string; // dónde pasamos por los productos
  cuentaPago?: string; // CLABE / cuenta donde le depositamos
}

// --- Carrito ---
export interface ItemCarrito {
  productoId: string;
  sitioId: string; // negocio dueño del producto
  negocio: string;
  slug: string;
  nombre: string;
  precio: number;
  emoji: string;
  cantidad: number;
  // "tienda" = se compra en la tienda del negocio (entrega por el negocio)
  // "marketplace" = lo vende y envía Telovendo
  tipo: "tienda" | "marketplace";
}

// --- Pedidos ---
export type EstadoPedido = "nuevo" | "preparando" | "enviado" | "entregado";

export interface DatosCliente {
  nombre: string;
  telefono: string;
  // Envío: requerido para pedidos de marketplace (Telovendo envía)
  direccion?: string;
  ciudad?: string;
  cp?: string;
  notas?: string;
}

export interface Pedido {
  id: string;
  folio: string; // legible, ej. TV-2X9K
  tipo: "tienda" | "marketplace";
  sitioId: string; // negocio vendedor
  negocio: string;
  slug: string;
  items: ItemCarrito[];
  total: number;
  cliente: DatosCliente;
  estado: EstadoPedido;
  creadoEn: number;
}

