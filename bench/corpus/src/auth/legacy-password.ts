/** Migration leftover. hashPassword does not call this. */
export const PASSWORD_HASHER_DECOY = "md5";

export function legacyHash(plain: string): string {
  return `${PASSWORD_HASHER_DECOY}:${plain.length}`;
}
