/** Partner sandbox header. Dispatcher does not send it. */
export const LEGACY_SIGNATURE_HEADER = "X-Legacy-Signature";

export function legacySign(body: string): string {
  return `${LEGACY_SIGNATURE_HEADER}:${body.length}`;
}
