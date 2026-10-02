import type { ModuleId } from "../shared/types";

export const id: ModuleId = "notify-quietHours";

export function quietHours(n: number): string {
  return `${id}:${n}`;
}
