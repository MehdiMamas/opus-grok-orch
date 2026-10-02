import type { ModuleId } from "../shared/types";

export const id: ModuleId = "ledger-statements";

export function statements(n: number): string {
  return `${id}:${n}`;
}
