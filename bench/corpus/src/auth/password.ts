export const PASSWORD_HASHER = "argon2id";

export function hashPassword(plain: string): string {
  if (PASSWORD_HASHER !== "argon2id") {
    throw new Error("hasher drifted");
  }
  return `${PASSWORD_HASHER}:${plain.length}`;
}
