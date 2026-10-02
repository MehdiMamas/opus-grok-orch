import { queueManualRefundReview } from "./refund-review";

export const REFUND_REVIEW_THRESHOLD_MINOR = 250000;

export function requestRefund(refundId: string, minor: number): string {
  if (minor >= REFUND_REVIEW_THRESHOLD_MINOR) {
    return queueManualRefundReview(refundId, minor);
  }
  return `auto:${refundId}:${minor}`;
}
