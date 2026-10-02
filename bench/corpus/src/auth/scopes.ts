import type { ModuleId } from "../shared/types";

export const id: ModuleId = "auth-scopes";

export function scopes(n: number): string {
  return `${id}:${n}`;
}
