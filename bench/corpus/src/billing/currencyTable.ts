import type { ModuleId } from "../shared/types";

export const id: ModuleId = "billing-currencyTable";

export function currencyTable(n: number): string {
  return `${id}:${n}`;
}
