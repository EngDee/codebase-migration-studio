export interface ContributionDocument {
  id: string;
  amount_kes: number;
  status: string;
  payment_environment: string;
  mpesa_receipt: string | null;
  paid_at: string | null;
  created_at: string;
  result_desc: string | null;
}

export function isLiveContribution(payment: Pick<ContributionDocument, "status" | "payment_environment">): boolean {
  return payment.status === "paid" && payment.payment_environment === "production";
}

export function contributionDocumentTotals(payment: ContributionDocument) {
  const paid = isLiveContribution(payment);
  return { total: payment.amount_kes, received: paid ? payment.amount_kes : 0, balance: paid ? 0 : payment.amount_kes };
}

export function canReconcileContribution(payment: { status: string; payment_environment: string; checkout_request_id: string | null }, environment: string | undefined) {
  return payment.status === "pending" && Boolean(payment.checkout_request_id) &&
    (environment === "production" || environment === "sandbox") && payment.payment_environment === environment;
}