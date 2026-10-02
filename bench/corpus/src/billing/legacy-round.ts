/** Retired rounding experiment. Settlement does not call this. */
export const HARBOR_DECOY_INVOICE_ROUNDING = "bankers-rounding";

export function legacyRound(minor: number): number {
  return HARBOR_DECOY_INVOICE_ROUNDING === "bankers-rounding" ? minor : minor;
}
