import { forwardRef, useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { captureDocument, canvasPng, documentPdf, deliverDocument, printDocument } from "@/lib/document-downloads";
import type { ContributionDocument } from "@/lib/payments/contribution-documents";
import { DigitalIdCard, type DigitalIdCardProps } from "./DigitalIdCard";
import { ContributionReceipt } from "./ContributionReceipt";

export interface MembershipDocumentsProps extends ComponentPropsWithoutRef<"div"> {
  payment: ContributionDocument;
  cardProps: DigitalIdCardProps;
  cardUnlocked: boolean;
}

/** Downloads are prepared before clicks to retain Safari's user activation. */
export const MembershipDocuments = forwardRef<HTMLDivElement, MembershipDocumentsProps>(function MembershipDocuments(
  { payment, cardProps, cardUnlocked, className, ...props }, ref,
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLElement>(null);
  const [files, setFiles] = useState<{ cardPdf?: Blob; cardPng?: Blob; receiptPdf?: Blob }>({});
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const filename = cardProps.membershipCode.replace(/[^a-z0-9-]/gi, "-");
  useEffect(() => {
    let cancelled = false;
    setFiles({}); setError(null);
    const prepare = async () => {
      try {
        const receipt = receiptRef.current;
        if (receipt) {
          const receiptPdf = await documentPdf([await captureDocument(receipt)], "a4");
          if (!cancelled) setFiles((previous) => ({ ...previous, receiptPdf }));
        }
        const card = cardRef.current;
        if (cardUnlocked && card) {
          const sides = Array.from(card.querySelectorAll<HTMLElement>(".ccak-id-card"));
          const canvases = [];
          for (const side of sides) canvases.push(await captureDocument(side));
          const cardPdf = await documentPdf(canvases, "card");
          const cardPng = await canvasPng(await captureDocument(card));
          if (!cancelled) setFiles((previous) => ({ ...previous, cardPdf, cardPng }));
        }
      } catch { if (!cancelled) setError("Could not prepare the download. Please retry, or print the document."); }
    };
    void prepare();
    return () => { cancelled = true; };
  }, [payment.id, payment.status, payment.mpesa_receipt, cardUnlocked, cardProps.fullName, cardProps.membershipCode, cardProps.photoUrl, cardProps.position, attempt]);
  const save = (blob: Blob | undefined, name: string) => {
    if (blob) void deliverDocument(blob, name).catch(() => setError("Could not save the document. Please try again."));
  };
  return <div {...props} ref={ref} className={cn("membership-documents", className)}>
    {cardUnlocked && <><div ref={cardRef} className="membership-card-output"><DigitalIdCard {...cardProps} /></div>
      <div className="document-actions flex flex-wrap gap-3 my-4">
        <Button disabled={!files.cardPdf} onClick={() => save(files.cardPdf, `${filename}-card.pdf`)}><Download aria-hidden="true" />{files.cardPdf ? "Download card PDF" : "Preparing card PDF…"}</Button>
        <Button variant="outline" disabled={!files.cardPng} onClick={() => save(files.cardPng, `${filename}-card.png`)}><Download aria-hidden="true" />Download card PNG</Button>
        <Button variant="outline" onClick={() => { if (cardRef.current) printDocument(cardRef.current); }}><Printer aria-hidden="true" />Print card</Button>
      </div></>}
    <ContributionReceipt ref={receiptRef} payment={payment} fullName={cardProps.fullName} membershipCode={cardProps.membershipCode} />
    <div className="document-actions flex flex-wrap gap-3 my-4">
      <Button disabled={!files.receiptPdf} onClick={() => save(files.receiptPdf, `${filename}-invoice-receipt.pdf`)}><Download aria-hidden="true" />{files.receiptPdf ? "Download invoice / receipt" : "Preparing invoice…"}</Button>
      <Button variant="outline" onClick={() => { if (receiptRef.current) printDocument(receiptRef.current); }}><Printer aria-hidden="true" />Print invoice / receipt</Button>
    </div>
    {error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setAttempt((value) => value + 1)}><RefreshCw aria-hidden="true" />Retry downloads</Button></div>}
  </div>;
});