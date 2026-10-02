import type { ModuleId } from "../shared/types";

export const id: ModuleId = "ledger-closures";

export function closures(n: number): string {
  return `${id}:${n}`;
}
