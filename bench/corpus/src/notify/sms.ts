import type { ModuleId } from "../shared/types";

export const id: ModuleId = "notify-sms";

export function sms(n: number): string {
  return `${id}:${n}`;
}
