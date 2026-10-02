import type { ModuleId } from "../shared/types";

export const id: ModuleId = "billing-receipts";

export function receipts(n: number): string {
  return `${id}:${n}`;
}
