import type { ModuleId } from "../shared/types";

export const id: ModuleId = "auth-mfa";

export function mfa(n: number): string {
  return `${id}:${n}`;
}
