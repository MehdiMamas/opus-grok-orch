import type { ModuleId } from "../shared/types";

export const id: ModuleId = "ledger-locks";

export function locks(n: number): string {
  return `${id}:${n}`;
}
