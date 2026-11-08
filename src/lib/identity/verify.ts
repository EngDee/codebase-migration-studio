/**
 * Phone ↔ National ID verification layer.
 *
 * IMPORTANT: Safaricom Daraja does NOT expose a public API that matches a
 * phone number to a National ID for arbitrary developers. That capability
 * is only available through commercial KYC / IPRS partners (Kora, Youverify,
 * Didit, MetaMap, Spin Mobile, or a direct IPRS VPN agreement).
 *
 * This module provides:
 *  1. A clear interface so the rest of the app stays provider-agnostic.
 *  2. A "local" mode that checks the number/ID already stored on the member
 *     profile (useful for development and for post-approval consistency).
 *  3. A stub for a real KYC provider that you enable once credentials exist.
 */

export type IdentityMatchInput = {
  nationalId: string;
  phone: string;
  fullName?: string;
  dateOfBirth?: string;
};

export type IdentityMatchResult = {
  matched: boolean;
  provider: "local" | "kyc_provider" | "mock";
  message: string;
  normalisedPhone?: string;
  details?: Record<string, unknown>;
};

function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length >= 12) return digits.slice(0, 12);
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

/**
 * Local consistency check against data already held in the CCAK profile.
 * This does NOT call Safaricom or IPRS – it only confirms the member’s
 * own recorded phone and national ID are present and well-formed.
 */
export async function verifyPhoneMatchesNationalIdLocal(
  input: IdentityMatchInput,
  stored: { national_id: string | null; phone: string | null },
): Promise<IdentityMatchResult> {
  const phone = normalisePhone(input.phone);
  const storedPhone = stored.phone ? normalisePhone(stored.phone) : null;
  const nid = input.nationalId.replace(/\D/g, "");
  const storedNid = stored.national_id?.replace(/\D/g, "") ?? null;

  if (!nid || nid.length < 6 || nid.length > 10) {
    return { matched: false, provider: "local", message: "Enter a valid National ID (6–10 digits)." };
  }
  if (!phone || phone.length !== 12) {
    return { matched: false, provider: "local", message: "Enter a valid Kenyan mobile number." };
  }
  if (!storedNid) {
    return {
      matched: false,
      provider: "local",
      message: "Complete your membership registration with a National ID first.",
    };
  }
  if (storedNid !== nid) {
    return {
      matched: false,
      provider: "local",
      message: "The National ID does not match the one on your membership record.",
    };
  }
  if (storedPhone && storedPhone !== phone) {
    return {
      matched: false,
      provider: "local",
      message: "The phone number does not match the one on your membership record. Update your profile or use the registered number.",
      normalisedPhone: phone,
    };
  }
  return {
    matched: true,
    provider: "local",
    message: "Phone and National ID match your membership record.",
    normalisedPhone: phone,
  };
}

/**
 * Optional external KYC provider (Kora / Youverify / Didit style).
 * Set IDENTITY_KYC_URL + IDENTITY_KYC_API_KEY in the server environment
 * and implement the provider contract when credentials are available.
 * Until then this returns a clear “not configured” result.
 */
export async function verifyWithExternalKyc(
  input: IdentityMatchInput,
): Promise<IdentityMatchResult> {
  const url = process.env["IDENTITY_KYC_URL"];
  const apiKey = process.env["IDENTITY_KYC_API_KEY"];
  if (!url || !apiKey) {
    return {
      matched: false,
      provider: "kyc_provider",
      message:
        "External National ID / phone verification is not configured. Use the local membership record check, or supply IDENTITY_KYC_URL and IDENTITY_KYC_API_KEY after obtaining a commercial KYC agreement.",
    };
  }

  // Provider-agnostic POST – adapt the body to the chosen vendor.
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      national_id: input.nationalId.replace(/\D/g, ""),
      phone: normalisePhone(input.phone),
      full_name: input.fullName,
      date_of_birth: input.dateOfBirth,
      verification_consent: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      matched: false,
      provider: "kyc_provider",
      message: `Identity provider error (${res.status}).`,
      details: { body: text.slice(0, 500) },
    };
  }

  const data = (await res.json()) as {
    matched?: boolean;
    status?: boolean | string;
    message?: string;
    data?: { mobile_telephone_number?: string; full_name?: string };
  };

  const matched =
    data.matched === true ||
    data.status === true ||
    data.status === "Approved" ||
    data.status === "found";

  return {
    matched,
    provider: "kyc_provider",
    message: matched
      ? "Phone number is registered against this National ID."
      : data.message || "Phone number could not be matched to this National ID.",
    normalisedPhone: normalisePhone(input.phone),
    details: data as Record<string, unknown>,
  };
}

/**
 * Primary entry point used by the app.
 * Prefers external KYC when configured; otherwise falls back to the local
 * membership-record check.
 */
export async function verifyMemberIdentity(
  input: IdentityMatchInput,
  storedProfile: { national_id: string | null; phone: string | null },
): Promise<IdentityMatchResult> {
  if (process.env["IDENTITY_KYC_URL"] && process.env["IDENTITY_KYC_API_KEY"]) {
    const external = await verifyWithExternalKyc(input);
    if (external.matched) return external;
    // Soft-fallback: still require local consistency if external fails
  }
  return verifyPhoneMatchesNationalIdLocal(input, storedProfile);
}
