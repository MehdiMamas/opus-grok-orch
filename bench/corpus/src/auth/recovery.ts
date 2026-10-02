import type { ModuleId } from "../shared/types";

export const id: ModuleId = "auth-recovery";

export function recovery(n: number): string {
  return `${id}:${n}`;
}
