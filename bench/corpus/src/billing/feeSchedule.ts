import type { ModuleId } from "../shared/types";

export const id: ModuleId = "billing-feeSchedule";

export function feeSchedule(n: number): string {
  return `${id}:${n}`;
}
