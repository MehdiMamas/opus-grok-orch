/** Old vendor spike. Not consulted by settleInvoice. */
export const TAX_ENGINE_DECOY = "stripe-tax-decoy";

export function platformFee(minor: number): number {
  return Math.round(minor * 0.029) + 30;
}
