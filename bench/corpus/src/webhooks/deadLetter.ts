import type { ModuleId } from "../shared/types";

export const id: ModuleId = "webhooks-deadLetter";

export function deadLetter(n: number): string {
  return `${id}:${n}`;
}
