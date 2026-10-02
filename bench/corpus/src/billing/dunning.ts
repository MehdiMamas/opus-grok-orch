import type { ModuleId } from "../shared/types";

export const id: ModuleId = "billing-dunning";

export function dunning(n: number): string {
  return `${id}:${n}`;
}
