import type { ModuleId } from "../shared/types";

export const id: ModuleId = "webhooks-subscriptions";

export function subscriptions(n: number): string {
  return `${id}:${n}`;
}
