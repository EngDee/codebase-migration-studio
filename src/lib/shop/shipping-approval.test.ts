import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: (input: unknown) => unknown = (input) => input;
    const builder = {
      middleware: () => builder,
      inputValidator: (fn: typeof validate) => { validate = fn; return builder; },
      handler: (fn: (input: unknown) => unknown) => (input: { data: unknown }) => fn({
        data: validate(input.data), context: { supabase: { rpc: mocks.rpc } },
      }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { saveStandardShipping } from "./shop.functions";

describe("standard shipping uses existing audited approval", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ error: null }); });
  const order_id = "8a28a497-831f-4d78-a329-7c87fbe45051";
  it.each(["member", "guest"] as const)("saves KES 350 using the %s order approval", async (kind) => {
    expect(await saveStandardShipping({ data: { order_id, kind, weight_kg: 4.5 } })).toMatchObject({ saved: true, fee_kes: 350 });
    expect(mocks.rpc).toHaveBeenCalledWith(kind === "guest" ? "quote_guest_shop_delivery" : "quote_shop_delivery", {
      order_id, fee_kes: 350, quote_reference: "CCAK standard parcel fee; packed weight 4.5 kg",
    });
  });
  it("rejects 5 kg before any database approval", async () => {
    await expect(async () => saveStandardShipping({ data: { order_id, kind: "guest", weight_kg: 5 } })).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not report success if database permissions reject approval", async () => {
    mocks.rpc.mockResolvedValue({ error: new Error("National administrator required") });
    await expect(saveStandardShipping({ data: { order_id, kind: "member", weight_kg: 1 } })).rejects.toThrow("Delivery fee was not saved");
  });
});