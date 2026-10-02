import type { ModuleId } from "../shared/types";

export const id: ModuleId = "auth-tenantLookup";

export function tenantLookup(n: number): string {
  return `${id}:${n}`;
}
