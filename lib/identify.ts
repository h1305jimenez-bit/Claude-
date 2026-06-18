// Identificación de un producto a partir de su foto.
// La IA (Claude visión) devuelve esta estructura; el modo demo la imita
// cuando no hay ANTHROPIC_API_KEY configurada.

export interface SugerenciaPrecio {
  etiqueta: string; // "Venta rápida" | "Recomendado" | "Máximo"
  monto: number; // MXN, entero (precio de venta al cliente)
  nota: string; // por qué ese precio
}

export interface Identificacion {
  nombre: string;
  categoria: string;
  condicion: string; // nuevo | como nuevo | usado
  descripcion: string;
  precios: SugerenciaPrecio[];
  demo?: boolean; // true si vino del modo demo (sin IA real)
}

export const SYSTEM_IDENTIFICAR = `Eres un experto en compra-venta de productos en México (nuevos y de segunda mano).
A partir de la foto, identifica el producto y estima su valor de reventa en pesos mexicanos (MXN).
Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra) con esta forma exacta:
{
  "nombre": "string corto y claro",
  "categoria": "string (ej. Electrónica, Ropa, Hogar, Calzado, Juguetes)",
  "condicion": "nuevo | como nuevo | usado",
  "descripcion": "1-2 frases describiendo el producto",
  "precios": [
    { "etiqueta": "Venta rápida", "monto": 0, "nota": "se vende rápido" },
    { "etiqueta": "Recomendado", "monto": 0, "nota": "precio justo de mercado" },
    { "etiqueta": "Máximo", "monto": 0, "nota": "si no tienes prisa" }
  ]
}
Los montos son enteros en MXN y deben ir de menor a mayor (rápida < recomendado < máximo).`;

// Catálogo para el modo demo (cuando no hay IA real disponible).
const DEMO: Omit<Identificacion, "demo">[] = [
  {
    nombre: "Tenis deportivos",
    categoria: "Calzado",
    condicion: "como nuevo",
    descripcion: "Tenis para correr, poco uso, suela en buen estado.",
    precios: [
      { etiqueta: "Venta rápida", monto: 450, nota: "se vende en días" },
      { etiqueta: "Recomendado", monto: 650, nota: "precio justo de mercado" },
      { etiqueta: "Máximo", monto: 850, nota: "si no tienes prisa" },
    ],
  },
  {
    nombre: "Audífonos inalámbricos",
    categoria: "Electrónica",
    condicion: "usado",
    descripcion: "Audífonos Bluetooth con estuche de carga.",
    precios: [
      { etiqueta: "Venta rápida", monto: 300, nota: "se vende en días" },
      { etiqueta: "Recomendado", monto: 480, nota: "precio justo de mercado" },
      { etiqueta: "Máximo", monto: 700, nota: "si no tienes prisa" },
    ],
  },
  {
    nombre: "Bolsa de mano",
    categoria: "Moda",
    condicion: "como nuevo",
    descripcion: "Bolsa de piel sintética, color neutro, ideal para diario.",
    precios: [
      { etiqueta: "Venta rápida", monto: 250, nota: "se vende en días" },
      { etiqueta: "Recomendado", monto: 420, nota: "precio justo de mercado" },
      { etiqueta: "Máximo", monto: 600, nota: "si no tienes prisa" },
    ],
  },
];

export function identificacionDemo(): Identificacion {
  const base = DEMO[Math.floor(Math.random() * DEMO.length)];
  return { ...base, demo: true };
}
