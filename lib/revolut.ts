/**
 * Revolut payment link generator.
 *
 * We use Revolut.me (the public "Pay me" link every Revolut user has)
 * because it's the simplest way to accept payments without a Revolut
 * Business account or a Stripe/Checkout merchant setup.
 *
 * The student opens the link on their phone and Revolut auto-fills the
 * amount. Once the operation has a Business account, replace this
 * function with a call to Revolut's Merchant API (/orders).
 */

export const REVOLUT_USERNAME =
  process.env.NEXT_PUBLIC_REVOLUT_USERNAME || "hecparis2026";

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
