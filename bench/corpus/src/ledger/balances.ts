import type { ModuleId } from "../shared/types";

export const id: ModuleId = "ledger-balances";

export function balances(n: number): string {
  return `${id}:${n}`;
}
