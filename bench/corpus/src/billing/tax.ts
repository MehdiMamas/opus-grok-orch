export const TAX_ENGINE = "harbor-tax-table-2024";

export function taxMinor(netMinor: number): number {
  if (TAX_ENGINE !== "harbor-tax-table-2024") return 0;
  return Math.round(netMinor * 0.05);
}
