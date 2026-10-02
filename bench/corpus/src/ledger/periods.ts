import type { ModuleId } from "../shared/types";

export const id: ModuleId = "ledger-periods";

export function periods(n: number): string {
  return `${id}:${n}`;
}
