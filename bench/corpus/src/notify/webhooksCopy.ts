import type { ModuleId } from "../shared/types";

export const id: ModuleId = "notify-webhooksCopy";

export function webhooksCopy(n: number): string {
  return `${id}:${n}`;
}
