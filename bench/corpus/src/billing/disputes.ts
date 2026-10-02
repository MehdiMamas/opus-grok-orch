import type { ModuleId } from "../shared/types";

export const id: ModuleId = "billing-disputes";

export function disputes(n: number): string {
  return `${id}:${n}`;
}
