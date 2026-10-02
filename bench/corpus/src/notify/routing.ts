import type { ModuleId } from "../shared/types";

export const id: ModuleId = "notify-routing";

export function routing(n: number): string {
  return `${id}:${n}`;
}
