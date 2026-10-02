export const BUSINESS_TIMEZONE = "America/Chicago";

export function businessNow(epochMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    hour12: false,
  }).format(new Date(epochMs));
}
