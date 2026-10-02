import type { ModuleId } from "../shared/types";

export const id: ModuleId = "auth-devices";

export function devices(n: number): string {
  return `${id}:${n}`;
}
