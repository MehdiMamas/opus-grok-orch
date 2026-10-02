import type { ModuleId } from "../shared/types";

export const id: ModuleId = "notify-push";

export function push(n: number): string {
  return `${id}:${n}`;
}
