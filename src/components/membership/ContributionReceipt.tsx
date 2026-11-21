import { forwardRef, type ComponentPropsWithoutRef } from "react";
import logo from "@/assets/ccak-logo.png.asset.json";
import { cn } from "@/lib/utils";
import { contributionDocumentTotals, isLiveContribution, type ContributionDocument } from "@/lib/payments/contribution-documents";

export interface ContributionReceiptProps extends ComponentPropsWithoutRef<"article"> {
  payment: ContributionDocument;
  fullName: string;
  membershipCode: string;
}

/** Owner-visible invoice, with a receipt only after confirmed production payment. */
export const ContributionReceipt = forwardRef<HTMLElement, ContributionReceiptProps>(function ContributionReceipt(
  { payment, fullName, membershipCode, className, ...props }, ref,
) {
  const paid = isLiveContribution(payment);
  const totals = contributionDocumentTotals(payment);
  const kes = (amount: number) => `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
  const date = (value: string) => new Date(value).toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" });
  return <article {...props} ref={ref} className={cn("order-receipt membership-receipt", className)} aria-label="Membership invoice and receipt">
    <header className="receipt-brand"><img src={logo.url} alt="CCAK logo" /><div><h2>Coffee Champions Association of Kenya</h2><p>{paid ? "Membership Invoice & Payment Receipt" : "Membership Contribution Invoice"}</p></div></header>
    <p className="font-semibold">{paid ? "PAID · M-Pesa contribution confirmed" : payment.payment_environment === "sandbox" ? "TEST ONLY · Not proof of payment" : "UNPAID · Awaiting live payment confirmation"}</p>
    <dl className="shop-totals">
      <div><dt>Invoice number</dt><dd>CCAK-MC-{payment.id.toUpperCase()}</dd></div>
      <div><dt>Member</dt><dd>{fullName}</dd></div>
      <div><dt>Membership number</dt><dd>{membershipCode}</dd></div>
      <div><dt>Invoice date</dt><dd>{date(payment.created_at)} EAT</dd></div>
      {paid && <><div><dt>M-Pesa receipt</dt><dd>{payment.mpesa_receipt || "Awaiting provider reference"}</dd></div>
        <div><dt>{payment.result_desc?.includes("reconciliation time") ? "Payment confirmed on" : "Payment date"}</dt><dd>{payment.paid_at ? `${date(payment.paid_at)} EAT` : "Not recorded"}</dd></div></>}
    </dl>
    <div className="receipt-line"><span>Annual membership contribution · 1</span><strong>{kes(totals.total)}</strong></div>
    <dl className="shop-totals"><div><dt>Total invoiced</dt><dd>{kes(totals.total)}</dd></div><div><dt>Payment received</dt><dd>{kes(totals.received)}</dd></div><div><dt>Balance due</dt><dd>{kes(totals.balance)}</dd></div></dl>
    <p>coffeechampions.co.ke</p><p>Association contribution acknowledgement. Not a tax invoice or eTIMS receipt.</p>
  </article>;
});