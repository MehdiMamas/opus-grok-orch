import type { ModuleId } from "../shared/types";

export const id: ModuleId = "auth-tokens";

export function tokens(n: number): string {
  return `${id}:${n}`;
}
