import type { ModuleId } from "../shared/types";

export const id: ModuleId = "notify-digest";

export function digest(n: number): string {
  return `${id}:${n}`;
}
