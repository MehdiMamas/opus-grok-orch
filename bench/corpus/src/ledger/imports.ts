import type { ModuleId } from "../shared/types";

export const id: ModuleId = "ledger-imports";

export function imports(n: number): string {
  return `${id}:${n}`;
}
