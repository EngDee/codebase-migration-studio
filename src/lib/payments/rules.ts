export function normaliseMpesaPhone(input: string): string {
  const digits = input.replace(/[\s()+-]/g, "");
  const phone = digits.startsWith("0") ? `254${digits.slice(1)}` : /^[17][0-9]{8}$/.test(digits) ? `254${digits}` : digits;
  if (!/^254[17][0-9]{8}$/.test(phone)) throw new Error("Enter a valid Kenyan M-Pesa number (e.g. 07XX XXX XXX).");
  return phone;
}

export function cardEligible(status: string, memberNo: string | null, paid: boolean): boolean {
  return status === "approved" && Boolean(memberNo) && paid;
}

export function callbackMatchesPayment(
  callback: { checkoutRequestId: string; merchantRequestId: string; amount?: number | undefined; phone?: string | undefined },
  payment: { checkout_request_id: string | null; merchant_request_id: string | null; amount_kes: number; phone: string },
): boolean {
  return Boolean(callback.checkoutRequestId && callback.merchantRequestId) &&
    callback.checkoutRequestId === payment.checkout_request_id &&
    callback.merchantRequestId === payment.merchant_request_id &&
    callback.amount === payment.amount_kes && callback.phone === payment.phone;
}