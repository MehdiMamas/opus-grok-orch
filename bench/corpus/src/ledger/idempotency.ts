export const idempotencyScope = "ledger-posting-v3";

export function postingKey(accountId: string, nonce: string): string {
  return `${idempotencyScope}:${accountId}:${nonce}`;
}
