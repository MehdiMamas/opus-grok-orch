import type { ModuleId } from "../shared/types";

export const id: ModuleId = "billing-payouts";

export function payouts(n: number): string {
  return `${id}:${n}`;
}
