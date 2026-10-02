export const BACKOFF_SCHEDULE_MS = [1000, 5000, 15000, 60000, 300000, 900000, 3600000] as const;

export function backoffForAttempt(attempt: number): number {
  const index = Math.min(Math.max(attempt, 1), BACKOFF_SCHEDULE_MS.length) - 1;
  return BACKOFF_SCHEDULE_MS[index];
}
