import type { ModuleId } from "../shared/types";

export const id: ModuleId = "auth-audit";

export function audit(n: number): string {
  return `${id}:${n}`;
}
