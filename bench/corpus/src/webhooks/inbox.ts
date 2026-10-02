import type { ModuleId } from "../shared/types";

export const id: ModuleId = "webhooks-inbox";

export function inbox(n: number): string {
  return `${id}:${n}`;
}
