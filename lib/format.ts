// Utilidades compartidas en toda la app.

export function mxn(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

export function waLink(numero: string, mensaje: string): string {
  const n = (numero || "").replace(/[^0-9]/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}`;
}

export function generarFolio(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `TV-${s}`;
}

export const ESTADO_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  preparando: "Preparando",
  enviado: "Enviado",
  entregado: "Entregado",
};

// --- Comisión del marketplace ---
// El cliente paga el precio de venta. Telovendo retiene 15% y el
// vendedor recibe el 85%.
export const COMISION_TELOVENDO = 0.15;

export function comisionTelovendo(precio: number): number {
  return Math.round(precio * COMISION_TELOVENDO);
}

export function pagoVendedor(precio: number): number {
  return precio - comisionTelovendo(precio);
}
