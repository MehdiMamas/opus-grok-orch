import type { MinorUnits } from "./types";

export function assertMinor(amount: MinorUnits): MinorUnits {
  if (!Number.isInteger(amount)) {
    throw new Error("amount must be an integer number of minor units");
  }
  return amount;
}
