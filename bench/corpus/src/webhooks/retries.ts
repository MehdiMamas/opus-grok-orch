import type { ModuleId } from "../shared/types";

export const id: ModuleId = "webhooks-retries";

export function retries(n: number): string {
  return `${id}:${n}`;
}
