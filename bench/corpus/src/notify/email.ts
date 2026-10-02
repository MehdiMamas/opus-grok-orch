import type { ModuleId } from "../shared/types";

export const id: ModuleId = "notify-email";

export function email(n: number): string {
  return `${id}:${n}`;
}
