import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ insert: vi.fn(), rpc: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: (input: unknown) => unknown = (input) => input;
    const builder = {
      middleware: () => builder,
      inputValidator: (fn: typeof validate) => { validate = fn; return builder; },
      handler: (fn: (input: unknown) => unknown) => (input: { data: unknown }) => fn({
        data: validate(input.data), context: {
          userId: "member-id", supabase: { from: query, rpc: mocks.rpc },
        },
      }),
    };
    return builder;
  },
}));
function query() {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: null, error: null }),
    gte: async () => ({ count: 0, error: null }),
    insert: (payload: unknown) => { mocks.insert(payload); return builder; },
    single: async () => ({ data: { id: "saved-order" }, error: null }),
  };
  return builder;
}
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: query } }));
vi.mock("./guest-session.server", () => ({ guestSession: async () => "session-hash" }));
vi.mock("./shipping", async (importOriginal) => {
  const original = await importOriginal<typeof import("./shipping")>();
  return {
    ...original,
    automaticDelivery: (items: Parameters<typeof original.automaticDelivery>[0], address: Parameters<typeof original.automaticDelivery>[1]) =>
      original.automaticDelivery(items, address, { "nyeri-aa": 0.3 }),
  };
});
import { createShopOrder } from "./shop.functions";
import { createGuestOrder } from "./guest.functions";

describe("automatic member and guest delivery totals", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("DARAJA_ENV", "production"); });
  const shipping = { full_name: "Delivery recipient", phone: "0700000000", country: "Kenya", county: "Nairobi", city: "Nairobi", address: "Delivery building", postal_code: "" };
  for (const [kind, create] of [["member", createShopOrder], ["guest", createGuestOrder]] as const) {
    it.each([
      ["Nairobi", 1, 350], ["Kiambu", 1, 350], ["Mombasa", 1, 500], ["Kiambu", 20, 1000],
    ] as const)(`${kind} stores a payment-ready order in %s at quantity %i`, async (county, quantity, fee) => {
      await create({ data: {
        items: [{ id: "nyeri-aa", quantity }], shipping: { ...shipping, county },
        request_key: "8a28a497-831f-4d78-a329-7c87fbe45051", customer_name: "Buyer name", customer_email: "buyer@example.test",
      } });
      expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
        shipping_kes: fee, amount_kes: 950 * quantity + fee, status: "ready", payment_environment: "production",
      }));
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
  }
});