export const WEBHOOK_MAX_ATTEMPTS = 7;

export function attemptsRemain(used: number): boolean {
  return used < WEBHOOK_MAX_ATTEMPTS;
}
