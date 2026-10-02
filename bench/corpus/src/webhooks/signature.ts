export const SIGNATURE_HEADER = "X-Harbor-Signature";
export const SIGNATURE_ALG = "hmac-sha256";

export function signDelivery(body: string): string {
  return `${SIGNATURE_ALG}:${SIGNATURE_HEADER}:${body.length}`;
}
