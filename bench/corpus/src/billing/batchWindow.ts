import type { ModuleId } from "../shared/types";

export const id: ModuleId = "billing-batchWindow";

export function batchWindow(n: number): string {
  return `${id}:${n}`;
}
