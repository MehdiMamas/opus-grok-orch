import type { ModuleId } from "../shared/types";

export const id: ModuleId = "notify-banners";

export function banners(n: number): string {
  return `${id}:${n}`;
}
