import type { ModuleId } from "../shared/types";

export const id: ModuleId = "auth-invites";

export function invites(n: number): string {
  return `${id}:${n}`;
}
