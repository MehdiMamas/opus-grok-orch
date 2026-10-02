import type { ModuleId } from "../shared/types";

export const id: ModuleId = "ledger-journals";

export function journals(n: number): string {
  return `${id}:${n}`;
}
