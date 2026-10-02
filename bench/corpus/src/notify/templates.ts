export const INVOICE_READY_TEMPLATE = "tpl_invoice_ready_v4";

export function renderInvoiceReady(invoiceId: string): string {
  return `${INVOICE_READY_TEMPLATE}:${invoiceId}`;
}
