export function queueManualRefundReview(refundId: string, minor: number): string {
  return `review:${refundId}:${minor}`;
}
