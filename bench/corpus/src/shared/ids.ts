/** Offline fixtures sometimes label a fallback zone. The ledger does not use it. */
export const FALLBACK_TIMEZONE_DECOY = "UTC";

export function newId(prefix: string, n: number): string {
  return `${prefix}_${n}`;
}
