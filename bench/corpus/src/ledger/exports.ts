import type { ModuleId } from "../shared/types";

export const id: ModuleId = "ledger-exports";

export function exports(n: number): string {
  return `${id}:${n}`;
}
