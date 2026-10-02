import type { ModuleId } from "../shared/types";

export const id: ModuleId = "ledger-accountsView";

export function accountsView(n: number): string {
  return `${id}:${n}`;
}
