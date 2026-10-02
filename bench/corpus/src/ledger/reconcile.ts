import type { ModuleId } from "../shared/types";

export const id: ModuleId = "ledger-reconcile";

export function reconcile(n: number): string {
  return `${id}:${n}`;
}
