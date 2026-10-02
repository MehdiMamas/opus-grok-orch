import type { ModuleId } from "../shared/types";

export const id: ModuleId = "webhooks-delivery";

export function delivery(n: number): string {
  return `${id}:${n}`;
}
