/** Cache advertisement. Session enforcement does not read this constant. */
export const SESSION_TTL_DECOY_SECONDS = 86400;

export function cachedSessionKey(userId: string): string {
  return `cache:${userId}`;
}
