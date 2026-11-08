import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PortalShell } from "@/components/PortalShell";
import { DigitalIdCard } from "@/components/membership/DigitalIdCard";
import { COUNTIES, MEMBER_TYPES, registrationSchema, hasStaffRole, photoUrl } from "@/lib/members";
import { getMembership, submitApplication, updateMemberDetails } from "@/lib/membership.functions";
import {
  getMyContributionStatus,
  initiateContributionPayment,
} from "@/lib/payments/contribution.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/membership")({
  head: () => ({
    meta: [
      { title: "My membership — CCAK" },
      { name: "description", content: "Register and manage your CCAK membership." },
      { property: "og:title", content: "My membership — CCAK" },
      { property: "og:description", content: "Register and manage your CCAK membership." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Membership,
});

type Profile = Tables<"profiles">;

function Membership() {
  const { user } = Route.useRouteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [application, setApplication] = useState<Tables<"membership_applications"> | null>(null);
  const [digitalCardUnlocked, setDigitalCardUnlocked] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [payPhone, setPayPhone] = useState("");
  const [payNationalId, setPayNationalId] = useState("");
  const [contributionKes, setContributionKes] = useState(500);

  const fetchMembership = useServerFn(getMembership);
  const submit = useServerFn(submitApplication);
  const update = useServerFn(updateMemberDetails);
  const startPayment = useServerFn(initiateContributionPayment);
  const fetchContributions = useServerFn(getMyContributionStatus);

  const load = async () => {
    try {
      const data = await fetchMembership();
      setProfile(data.profile);
      setApplication(data.applications[0] ?? null);
      setIsAdmin(hasStaffRole(data.roles.map((r) => r.role)));
      setPhoto(await photoUrl(data.profile.photo_path));
      setPayPhone(data.profile.phone ?? "");
      setPayNationalId(data.profile.national_id ?? "");
    } catch {
      setMsg({ text: "Could not load your membership. Please refresh and try again." });
    }
    try {
      const contrib = await fetchContributions();
      setDigitalCardUnlocked(Boolean(contrib.digitalCardUnlocked));
      if (typeof contrib.amountKes === "number") setContributionKes(contrib.amountKes);
    } catch {
      // Table may not exist yet before migration
      setDigitalCardUnlocked(false);
    }
  };

  useEffect(() => {
    load();
  }, [user.id]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = registrationSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return setMsg({ text: parsed.error.issues[0]?.message ?? "Check your details" });
    const newApplication = !application || application.application_status === "rejected";
    if (newApplication && fd.get("terms") !== "on") return setMsg({ text: "Accept the membership terms." });
    setBusy(true);
    setMsg(null);
    let photo_path = profile?.photo_path ?? null;
    const file = fd.get("photo") as File | null;
    if (file && file.size > 0) {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
        setBusy(false);
        return setMsg({ text: "Photo must be an image under 5 MB." });
      }
      photo_path = `${user.id}/photo-${Date.now()}.${file.name.split(".").pop()?.toLowerCase() ?? "jpg"}`;
      const up = await supabase.storage.from("member-photos").upload(photo_path, file, { upsert: true });
      if (up.error) {
        setBusy(false);
        return setMsg({ text: "Photo upload failed." });
      }
    }
    try {
      if (newApplication) {
        const documents = fd.getAll("documents").filter((v): v is File => v instanceof File && v.size > 0);
        if (documents.length > 5) throw new Error("Choose no more than five documents.");
        const paths: string[] = [];
        for (const doc of documents) {
          if (doc.size > 5 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(doc.type)) {
            throw new Error("Documents must be PDF, JPG or PNG under 5 MB.");
          }
          const path = `${user.id}/${crypto.randomUUID()}.${doc.type === "application/pdf" ? "pdf" : doc.type === "image/png" ? "png" : "jpg"}`;
          const { error } = await supabase.storage.from("supporting-documents").upload(path, doc);
          if (error) throw new Error("Document upload failed. Please try again.");
          paths.push(path);
        }
        const saved = await submit({
          data: { ...parsed.data, photo_path, supporting_documents: paths, terms_accepted: true },
        });
        setMsg({
          ok: true,
          text: `Application saved · ${saved.application_number}. Your application is with the CCAK team.`,
        });
      } else {
        await update({ data: { ...parsed.data, photo_path } });
        setMsg({ ok: true, text: "Your personal details have been saved." });
      }
      await load();
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "Could not save. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const onPay = async (e: FormEvent) => {
    e.preventDefault();
    setPayBusy(true);
    setPayMsg(null);
    try {
      const result = await startPayment({
        data: { phone: payPhone.trim(), national_id: payNationalId.trim() },
      });
      setPayMsg({
        ok: true,
        text:
          result.customerMessage ||
          `M-Pesa prompt sent. Enter your PIN to pay KES ${result.amount}. The digital card unlocks after payment is confirmed.`,
      });
      // Poll a few times for callback confirmation
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const contrib = await fetchContributions();
        if (contrib.digitalCardUnlocked) {
          setDigitalCardUnlocked(true);
          setPayMsg({ ok: true, text: "Payment confirmed. Your digital membership card is ready." });
          break;
        }
      }
    } catch (error) {
      setPayMsg({ text: error instanceof Error ? error.message : "Could not start M-Pesa payment." });
    } finally {
      setPayBusy(false);
    }
  };

  const p = profile;
  const approved = p?.status === "approved" && Boolean(p.member_no);
  const presidentName =
    (typeof process !== "undefined" && process.env?.["CCAK_PRESIDENT_NAME"]) ||
    "CCAK National President";

  return (
    <PortalShell isAdmin={isAdmin}>
      <h1>My membership</h1>
      {application && (
        <p role="status">
          Application {application.application_number} · {application.application_status}
          {application.review_notes ? ` · ${application.review_notes}` : ""}
        </p>
      )}
      {p && (
        <div className="member-card">
          <div className="member-photo">
            {photo ? <img src={photo} alt="Member" /> : <span>{(p.full_name ?? "?")[0]}</span>}
          </div>
          <div>
            <strong>{p.full_name || user.email}</strong>
            <div>
              {MEMBER_TYPES.find(([v]) => v === p.member_type)?.[1] ?? "Membership type not set"} ·{" "}
              {p.county ?? "County not set"}
            </div>
            <div className={`status status-${p.status}`}>
              {p.submitted_at
                ? p.status === "approved"
                  ? `Approved · ${p.member_no}`
                  : p.status === "rejected"
                    ? "Not approved"
                    : "Pending approval"
                : "Registration not submitted"}
            </div>
          </div>
        </div>
      )}

      {/* Digital card + contribution */}
      {approved && (
        <section className="portal-section digital-id-section" aria-labelledby="digital-id-heading">
          <h2 id="digital-id-heading">Digital membership card</h2>
          {digitalCardUnlocked ? (
            <>
              <p className="section-note">
                Your contribution is paid. You can present this card at county events; field officers
                can verify status from the membership portal.
              </p>
              <DigitalIdCard
                fullName={p?.full_name || user.email || "Member"}
                membershipCode={p?.member_no || "—"}
                nationalId={p?.national_id || "—"}
                county={p?.county || "—"}
                photoUrl={photo}
                memberSince={
                  p?.reviewed_at
                    ? new Date(p.reviewed_at).toLocaleDateString("en-KE", {
                        year: "numeric",
                        month: "short",
                      })
                    : undefined
                }
                presidentName={presidentName}
              />
            </>
          ) : (
            <>
              <p className="section-note">
                Pay the annual membership contribution (KES {contributionKes}) via M-Pesa to unlock
                your official CCAK digital ID card. The amount is charged once the prompt is approved
                on your phone.
              </p>
              <form className="portal-form" onSubmit={onPay}>
                <label htmlFor="payPhone">M-Pesa phone number</label>
                <input
                  id="payPhone"
                  type="tel"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                  placeholder="07xx xxx xxx"
                  required
                />
                <label htmlFor="payNationalId">National ID (must match your membership record)</label>
                <input
                  id="payNationalId"
                  inputMode="numeric"
                  pattern="[0-9]{6,10}"
                  minLength={6}
                  maxLength={10}
                  value={payNationalId}
                  onChange={(e) => setPayNationalId(e.target.value)}
                  required
                />
                <Button className="btn btn-forest" type="submit" disabled={payBusy}>
                  {payBusy ? "Waiting for M-Pesa…" : `Pay KES ${contributionKes} with M-Pesa`}
                </Button>
                {payMsg && (
                  <p className={`portal-msg${payMsg.ok ? " ok" : ""}`} role="status">
                    {payMsg.text}
                  </p>
                )}
              </form>
            </>
          )}
        </section>
      )}

      <form key={p?.updated_at ?? "new"} className="portal-form wide" onSubmit={onSubmit}>
        <h2>{p?.submitted_at ? "Update your details" : "Complete your registration"}</h2>
        <label htmlFor="rName">Full name</label>
        <input id="rName" name="full_name" defaultValue={p?.full_name ?? ""} required maxLength={120} />
        <label htmlFor="rPhone">Phone (M-Pesa)</label>
        <input
          id="rPhone"
          name="phone"
          type="tel"
          defaultValue={p?.phone ?? ""}
          placeholder="07xx xxx xxx"
          required
        />
        <label htmlFor="rNationalId">National ID</label>
        <input
          id="rNationalId"
          name="national_id"
          inputMode="numeric"
          pattern="[0-9]{6,10}"
          minLength={6}
          maxLength={10}
          defaultValue={p?.national_id ?? ""}
          readOnly={Boolean(p?.national_id && application)}
          required
        />
        <label htmlFor="rGender">Gender</label>
        <select id="rGender" name="gender" defaultValue={p?.gender ?? ""} required>
          <option value="" disabled>
            Choose gender
          </option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
        <label htmlFor="rDateOfBirth">Date of birth</label>
        <input
          id="rDateOfBirth"
          name="date_of_birth"
          type="date"
          min="1900-01-01"
          defaultValue={p?.date_of_birth ?? ""}
          readOnly={Boolean(p?.national_id && application)}
          required
        />
        <label htmlFor="rCounty">County</label>
        <select id="rCounty" name="county" defaultValue={p?.county ?? ""} required>
          <option value="" disabled>
            Choose county
          </option>
          {COUNTIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label htmlFor="rType">Membership type</label>
        <select id="rType" name="member_type" defaultValue={p?.member_type ?? ""} required>
          <option value="" disabled>
            Choose type
          </option>
          {MEMBER_TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <label htmlFor="rSubCounty">Sub-county</label>
        <input id="rSubCounty" name="sub_county" defaultValue={p?.sub_county ?? ""} maxLength={80} />
        <label htmlFor="rBiz">Farm / business name</label>
        <input id="rBiz" name="business_name" defaultValue={p?.business_name ?? ""} maxLength={150} />
        <label htmlFor="rSize">Farm / business size (e.g. 2 acres, 500 trees)</label>
        <input id="rSize" name="farm_size" defaultValue={p?.farm_size ?? ""} maxLength={60} />
        <label htmlFor="rPhoto">Photo for member card</label>
        <input id="rPhoto" name="photo" type="file" accept="image/*" />
        {(!application || application.application_status === "rejected") && (
          <>
            <label htmlFor="rDocuments">Supporting documents (optional)</label>
            <input
              id="rDocuments"
              name="documents"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              multiple
            />
            <label>
              <input type="checkbox" name="terms" required /> I accept the association’s membership
              terms.
            </label>
          </>
        )}
        <Button className="btn btn-forest" type="submit" disabled={busy}>
          {busy
            ? "Saving…"
            : application && application.application_status !== "rejected"
              ? "Save details"
              : "Submit registration"}
        </Button>
        {msg && (
          <p className={`portal-msg${msg.ok ? " ok" : ""}`} role="status">
            {msg.text}
          </p>
        )}
      </form>
    </PortalShell>
  );
}
