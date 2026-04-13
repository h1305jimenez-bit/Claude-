/**
 * Generador de enlaces de pago con Revolut.
 *
 * Usamos Revolut.me (el enlace público "Pay me" que todo usuario de Revolut
 * tiene) porque es la manera más simple de aceptar pagos sin una cuenta
 * Revolut Business ni registrar un comercio en Stripe/Checkout.
 *
 * El estudiante abre el enlace en su móvil y Revolut rellena automáticamente
 * el importe. Cuando se tenga cuenta Business, se puede sustituir esta
 * función por una llamada a la Merchant API de Revolut (/orders).
 */

export const REVOLUT_USERNAME =
  process.env.NEXT_PUBLIC_REVOLUT_USERNAME || "hecdelivery";

export function buildRevolutPayLink(params: {
  amountEUR: number;
  orderId: string;
}): string {
  const amount = Math.max(0, Math.round(params.amountEUR * 100) / 100).toFixed(2);
  const qs = new URLSearchParams({
    amount,
    currency: "EUR",
    reference: params.orderId,
  });
  return `https://revolut.me/${REVOLUT_USERNAME}?${qs.toString()}`;
}
