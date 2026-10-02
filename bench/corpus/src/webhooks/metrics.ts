import type { ModuleId } from "../shared/types";

export const id: ModuleId = "webhooks-metrics";

export function metrics(n: number): string {
  return `${id}:${n}`;
}
