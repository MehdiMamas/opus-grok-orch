import type { ModuleId } from "../shared/types";

export const id: ModuleId = "billing-credits";

export function credits(n: number): string {
  return `${id}:${n}`;
}
