import { estiloDef } from "./templates";
import type {
  EstiloId,
  GiroId,
  Producto,
  Seccion,
  Sitio,
} from "./types";

export interface EntradaGeneracion {
  nombreNegocio: string;
  giro: GiroId;
  estilo: EstiloId;
  descripcionNegocio: string;
  whatsapp: string;
}

// Presets por giro. En la Fase "IA" esto lo generará Claude devolviendo
// el MISMO JSON de secciones; la firma de generarSitio() no cambia.
interface Preset {
  heroSub: string;
  cta: string;
  servicios: { titulo: string; descripcion: string; emoji: string }[];
  galeria: string[];
  productos: Omit<Producto, "id">[];
}

const PRESETS: Record<GiroId, Preset> = {
  comida: {
    heroSub: "Sabor casero, ingredientes frescos y el mejor servicio de la zona.",
    cta: "Ver menú",
    servicios: [
      { titulo: "Para llevar", descripcion: "Ordena y recoge en minutos.", emoji: "🥡" },
      { titulo: "Servicio a domicilio", descripcion: "Te lo llevamos calientito.", emoji: "🛵" },
      { titulo: "Eventos", descripcion: "Cotiza para tu fiesta o reunión.", emoji: "🎉" },
    ],
    galeria: ["🌮", "🥗", "🍰", "🥤", "🍔", "🌯"],
    productos: [
      { nombre: "Orden de tacos", descripcion: "3 tacos al pastor con todo.", precio: 75, emoji: "🌮", enMarketplace: false },
      { nombre: "Postre del día", descripcion: "Rebanada de pastel casero.", precio: 55, emoji: "🍰", enMarketplace: false },
    ],
  },
  belleza: {
    heroSub: "Realza tu estilo con un equipo profesional que te consiente.",
    cta: "Agenda tu cita",
    servicios: [
      { titulo: "Corte y peinado", descripcion: "Para toda ocasión.", emoji: "💇" },
      { titulo: "Color", descripcion: "Tintes y mechas de calidad.", emoji: "🎨" },
      { titulo: "Uñas", descripcion: "Manicure y pedicure.", emoji: "💅" },
    ],
    galeria: ["💇", "💅", "✨", "💆", "🎨", "🪞"],
    productos: [
      { nombre: "Paquete corte + peinado", descripcion: "Incluye lavado.", precio: 280, emoji: "💇", enMarketplace: false },
      { nombre: "Manicure completo", descripcion: "Esmaltado a elegir.", precio: 200, emoji: "💅", enMarketplace: false },
    ],
  },
  servicios: {
    heroSub: "Soluciones rápidas y confiables, con garantía en cada trabajo.",
    cta: "Pide tu cotización",
    servicios: [
      { titulo: "Diagnóstico gratis", descripcion: "Revisamos sin costo.", emoji: "🔍" },
      { titulo: "Servicio a domicilio", descripcion: "Vamos a donde estés.", emoji: "🚐" },
      { titulo: "Garantía", descripcion: "Respaldamos nuestro trabajo.", emoji: "✅" },
    ],
    galeria: ["🔧", "🛠️", "⚙️", "🧰", "🚐", "📋"],
    productos: [
      { nombre: "Servicio básico", descripcion: "Revisión y ajuste estándar.", precio: 350, emoji: "🔧", enMarketplace: false },
    ],
  },
  tienda: {
    heroSub: "Productos seleccionados con cariño y a buen precio.",
    cta: "Ver productos",
    servicios: [
      { titulo: "Envíos a todo México", descripcion: "Recíbelo en tu casa.", emoji: "📦" },
      { titulo: "Pago seguro", descripcion: "Tarjeta, SPEI u OXXO.", emoji: "🔒" },
      { titulo: "Cambios fáciles", descripcion: "Tu compra protegida.", emoji: "🔄" },
    ],
    galeria: ["🛍️", "👕", "🎁", "👜", "🧢", "👟"],
    productos: [
      { nombre: "Producto destacado", descripcion: "El favorito de nuestros clientes.", precio: 299, emoji: "🛍️", enMarketplace: true },
      { nombre: "Novedad", descripcion: "Recién llegado a la tienda.", precio: 459, emoji: "🎁", enMarketplace: true },
    ],
  },
  salud: {
    heroSub: "Atención profesional y cercana para cuidar de ti y tu familia.",
    cta: "Reserva tu consulta",
    servicios: [
      { titulo: "Consulta", descripcion: "Atención personalizada.", emoji: "🩺" },
      { titulo: "Seguimiento", descripcion: "Acompañamiento continuo.", emoji: "📈" },
      { titulo: "Horario amplio", descripcion: "Citas entre semana y sábados.", emoji: "🗓️" },
    ],
    galeria: ["🩺", "💊", "🧬", "🏥", "❤️", "🦷"],
    productos: [
      { nombre: "Consulta general", descripcion: "Valoración completa.", precio: 500, emoji: "🩺", enMarketplace: false },
    ],
  },
  otro: {
    heroSub: "Bienvenido a nuestro negocio. Conoce lo que tenemos para ti.",
    cta: "Conócenos",
    servicios: [
      { titulo: "Calidad", descripcion: "Lo hacemos bien desde el inicio.", emoji: "⭐" },
      { titulo: "Atención", descripcion: "Estamos para ayudarte.", emoji: "🤝" },
      { titulo: "Confianza", descripcion: "Clientes que regresan.", emoji: "💜" },
    ],
    galeria: ["✨", "⭐", "🤝", "💜", "🎯", "🚀"],
    productos: [
      { nombre: "Nuestro servicio", descripcion: "Lo que ofrecemos.", precio: 199, emoji: "✨", enMarketplace: false },
    ],
  },
};

function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "negocio";
}

export function nuevoId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Genera un sitio completo a partir de los datos del negocio.
 * MVP: usa presets deterministas. Misma firma que tendrá la versión con IA.
 */
export function generarSitio(entrada: EntradaGeneracion): Sitio {
  const preset = PRESETS[entrada.giro];
  const tema = estiloDef(entrada.estilo).tema;
  const nombre = entrada.nombreNegocio.trim() || "Mi negocio";
  const desc =
    entrada.descripcionNegocio.trim() || preset.heroSub;

  const secciones: Seccion[] = [
    {
      id: nuevoId(),
      tipo: "hero",
      visible: true,
      titulo: nombre,
      subtitulo: desc,
      cta: preset.cta,
    },
    {
      id: nuevoId(),
      tipo: "servicios",
      visible: true,
      titulo: "Lo que ofrecemos",
      items: preset.servicios,
    },
    {
      id: nuevoId(),
      tipo: "productos",
      visible: true,
      titulo: "Productos",
    },
    {
      id: nuevoId(),
      tipo: "galeria",
      visible: true,
      titulo: "Galería",
      emojis: preset.galeria,
    },
    {
      id: nuevoId(),
      tipo: "testimonios",
      visible: true,
      titulo: "Lo que dicen nuestros clientes",
      items: [
        { nombre: "Cliente feliz", texto: "¡Excelente atención y calidad! Súper recomendado." },
        { nombre: "Cliente frecuente", texto: "Siempre regreso, nunca me fallan." },
      ],
    },
    {
      id: nuevoId(),
      tipo: "contacto",
      visible: true,
      titulo: "Visítanos",
      direccion: "Agrega tu dirección aquí",
      horario: "Lun a Sáb, 9:00 - 19:00",
    },
  ];

  const productos: Producto[] = preset.productos.map((p) => ({
    ...p,
    id: nuevoId(),
  }));

  return {
    id: nuevoId(),
    slug: slugify(nombre) + "-" + nuevoId().slice(0, 4),
    nombreNegocio: nombre,
    giro: entrada.giro,
    estilo: entrada.estilo,
    descripcionNegocio: desc,
    whatsapp: entrada.whatsapp.replace(/[^0-9]/g, ""),
    tema,
    secciones,
    tiendaActiva: entrada.giro === "tienda",
    productos,
    creadoEn: Date.now(),
  };
}
