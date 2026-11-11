import { beforeEach, describe, expect, it, vi } from "vitest";
import { paymentLabel } from "./order-rules";

const mocks = vi.hoisted(() => ({
  handler: undefined as undefined | ((input: { request: Request }) => Promise<Response>),
  query: vi.fn(),
  configuration: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { server: { handlers: { POST: typeof mocks.handler } } }) => {
    mocks.handler = options.server.handlers.POST;
    return options;
  },
}));
vi.mock("@/lib/payments/daraja", async (original) => ({
  ...await original<typeof import("@/lib/payments/daraja")>(),
  queryStkResult: mocks.query,
  requireDarajaConfiguration: mocks.configuration,
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
import "@/routes/api/public/shop/mpesa/callback";

const pendingOrder = {
  id: "order-1", status: "pending", payment_environment: "sandbox",
  checkout_request_id: "checkout-1", merchant_request_id: "merchant-1",
  phone: "254712345678", amount_kes: 2500, mpesa_receipt: null as string | null,
  paid_at: null as string | null,
};

describe("shop payment confirmation for guests and members", () => {
  let guest: typeof pendingOrder | null;
  let member: typeof pendingOrder | null;
  let readError: boolean;
  let updateError: boolean;
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["DARAJA_ENV"] = "sandbox";
    guest = { ...pendingOrder };
    member = null;
    readError = false;
    updateError = false;
    mocks.query.mockResolvedValue(0);
    mocks.from.mockImplementation((table: string) => {
      const row = table === "guest_shop_orders" ? guest : member;
      const selectChain = {
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: row, error: readError ? new Error("read failed") : null })),
      };
      return {
        select: () => selectChain,
        update: (values: Partial<typeof pendingOrder>) => {
          const filters: Record<string, unknown> = {};
          const chain = {
            eq: (key: string, value: unknown) => { filters[key] = value; return chain; },
            then: (resolve: (value: { error: Error | null }) => void) => {
              if (!updateError && row && filters.id === row.id && filters.status === row.status) Object.assign(row, values);
              resolve({ error: updateError ? new Error("update failed") : null });
            },
          };
          return chain;
        },
      };
    });
  });

  async function confirm(resultCode = 0, amount = 2500, phone = 254712345678, merchant = "merchant-1") {
    if (!mocks.handler) throw new Error("Callback handler missing");
    return mocks.handler({ request: new Request("https://example.test/api/public/shop/mpesa/callback", {
      method: "POST", body: JSON.stringify({ Body: { stkCallback: {
        CheckoutRequestID: "checkout-1", MerchantRequestID: merchant,
        ResultCode: resultCode, ResultDesc: resultCode === 0 ? "Success" : "Cancelled",
        ...(resultCode === 0 ? { CallbackMetadata: { Item: [
          { Name: "Amount", Value: amount }, { Name: "PhoneNumber", Value: phone },
          { Name: "MpesaReceiptNumber", Value: "TEST-RECEIPT" },
        ] } } : {}),
      } } }),
    }) });
  }

  it("marks a verified guest payment paid and reads back the test-payment status", async () => {
    expect((await confirm()).status).toBe(200);
    expect(guest).toMatchObject({ status: "paid", mpesa_receipt: "TEST-RECEIPT" });
    expect(guest?.paid_at).toEqual(expect.any(String));
    if (!guest) throw new Error("Guest order missing");
    expect(paymentLabel(guest)).toBe("Test payment confirmed — no real money charged");
  });
  it("marks a verified cancelled guest payment failed", async () => {
    mocks.query.mockResolvedValue(1032);
    expect((await confirm(1032)).status).toBe(200);
    expect(guest).toMatchObject({ status: "failed", mpesa_receipt: null, paid_at: null });
  });
  it("continues to confirm member payments", async () => {
    member = { ...pendingOrder }; guest = null;
    expect((await confirm()).status).toBe(200);
    expect(member.status).toBe("paid");
  });
  it("does not update either order when Safaricom disagrees", async () => {
    mocks.query.mockResolvedValue(1032);
    expect((await confirm()).status).toBe(409);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each([[2499, 254712345678], [2500, 254712345679]])("rejects incorrect amount or phone (%s, %s)", async (amount, phone) => {
    expect((await confirm(0, amount, phone)).status).toBe(409);
    expect(guest?.status).toBe("pending");
  });
  it("rejects an incorrect merchant reference", async () => {
    expect((await confirm(0, 2500, 254712345678, "other-merchant")).status).toBe(404);
    expect(guest?.status).toBe("pending");
  });
  it("does not change production orders via the sandbox callback", async () => {
    guest = { ...pendingOrder, payment_environment: "production" };
    expect((await confirm()).status).toBe(404);
    expect(guest.status).toBe("pending");
  });
  it("returns 404 for an unknown payment", async () => {
    guest = null;
    expect((await confirm()).status).toBe(404);
  });
  it("accepts duplicate callbacks without changing a settled guest payment", async () => {
    expect((await confirm()).status).toBe(200);
    const settled = { ...guest };
    expect((await confirm()).status).toBe(200);
    expect(guest).toEqual(settled);
  });
  it("does not treat a member lookup error as permission to update a guest", async () => {
    readError = true;
    expect((await confirm()).status).toBe(503);
    expect(guest?.status).toBe("pending");
  });
  it("returns a retryable failure when the update fails", async () => {
    updateError = true;
    expect((await confirm()).status).toBe(503);
    expect(guest?.status).toBe("pending");
  });
});