import type { ModuleId } from "../shared/types";

export const id: ModuleId = "webhooks-fanout";

export function fanout(n: number): string {
  return `${id}:${n}`;
}
