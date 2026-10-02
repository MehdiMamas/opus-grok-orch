import type { ModuleId } from "../shared/types";

export const id: ModuleId = "webhooks-outbox";

export function outbox(n: number): string {
  return `${id}:${n}`;
}
