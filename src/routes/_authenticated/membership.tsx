import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PortalShell } from "@/components/PortalShell";
import { COUNTIES, MEMBER_TYPES, registrationSchema, hasStaffRole, photoUrl } from "@/lib/members";
import { getMembership, submitApplication, updateMemberDetails } from "@/lib/membership.functions";
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
  const fetchMembership = useServerFn(getMembership);
  const submit = useServerFn(submitApplication);
  const update = useServerFn(updateMemberDetails);

  const load = async () => {
    try {
      const data = await fetchMembership();
      setProfile(data.profile);
      setApplication(data.applications[0] ?? null);
      setIsAdmin(hasStaffRole(data.roles.map((r) => r.role)));
      setPhoto(await photoUrl(data.profile.photo_path));
    } catch { setMsg({ text: "Could not load your membership. Please refresh and try again." }); }
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
    setBusy(true); setMsg(null);
    let photo_path = profile?.photo_path ?? null;
    const file = fd.get("photo") as File | null;
    if (file && file.size > 0) {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
        setBusy(false);
        return setMsg({ text: "Photo must be an image under 5 MB." });
      }
      photo_path = `${user.id}/photo-${Date.now()}.${file.name.split(".").pop()?.toLowerCase() ?? "jpg"}`;
      const up = await supabase.storage.from("member-photos").upload(photo_path, file, { upsert: true });
      if (up.error) { setBusy(false); return setMsg({ text: "Photo upload failed." }); }
    }
    try {
      if (newApplication) {
        const documents = fd.getAll("documents").filter((v): v is File => v instanceof File && v.size > 0);
        if (documents.length > 5) throw new Error("Choose no more than five documents.");
        const paths: string[] = [];
        for (const doc of documents) {
          if (doc.size > 5 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(doc.type)) throw new Error("Documents must be PDF, JPG or PNG under 5 MB.");
          const path = `${user.id}/${crypto.randomUUID()}.${doc.type === "application/pdf" ? "pdf" : doc.type === "image/png" ? "png" : "jpg"}`;
          const { error } = await supabase.storage.from("supporting-documents").upload(path, doc);
          if (error) throw new Error("Document upload failed. Please try again.");
          paths.push(path);
        }
        const saved = await submit({ data: { ...parsed.data, photo_path, supporting_documents: paths, terms_accepted: true } });
        setMsg({ ok: true, text: `Application saved · ${saved.application_number}. Your application is with the CCAK team.` });
      } else {
        await update({ data: { ...parsed.data, photo_path } });
        setMsg({ ok: true, text: "Your personal details have been saved." });
      }
      await load();
    } catch (error) { setMsg({ text: error instanceof Error ? error.message : "Could not save. Please try again." }); }
    finally { setBusy(false); }
  };

  const p = profile;
  return (
    <PortalShell isAdmin={isAdmin}>
      <h1>My membership</h1>
      {application && <p role="status">Application {application.application_number} · {application.application_status}{application.review_notes ? ` · ${application.review_notes}` : ""}</p>}
      {p && (
        <div className="member-card">
          <div className="member-photo">{photo ? <img src={photo} alt="Member" /> : <span>{(p.full_name ?? "?")[0]}</span>}</div>
          <div>
            <strong>{p.full_name || user.email}</strong>
            <div>{MEMBER_TYPES.find(([v]) => v === p.member_type)?.[1] ?? "Membership type not set"} · {p.county ?? "County not set"}</div>
            <div className={`status status-${p.status}`}>
              {p.submitted_at ? (p.status === "approved" ? `Approved · ${p.member_no}` : p.status === "rejected" ? "Not approved" : "Pending approval") : "Registration not submitted"}
            </div>
          </div>
        </div>
      )}
      <form key={p?.updated_at ?? "new"} className="portal-form wide" onSubmit={onSubmit}>
        <h2>{p?.submitted_at ? "Update your details" : "Complete your registration"}</h2>
        <label htmlFor="rName">Full name</label>
        <input id="rName" name="full_name" defaultValue={p?.full_name ?? ""} required maxLength={120} />
        <label htmlFor="rPhone">Phone (M-Pesa)</label>
        <input id="rPhone" name="phone" type="tel" defaultValue={p?.phone ?? ""} placeholder="07xx xxx xxx" required />
        <label htmlFor="rCounty">County</label>
        <select id="rCounty" name="county" defaultValue={p?.county ?? ""} required>
          <option value="" disabled>Choose county</option>
          {COUNTIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label htmlFor="rType">Membership type</label>
        <select id="rType" name="member_type" defaultValue={p?.member_type ?? ""} required>
          <option value="" disabled>Choose type</option>
          {MEMBER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label htmlFor="rSubCounty">Sub-county</label>
        <input id="rSubCounty" name="sub_county" defaultValue={p?.sub_county ?? ""} maxLength={80} />
        <label htmlFor="rBiz">Farm / business name</label>
        <input id="rBiz" name="business_name" defaultValue={p?.business_name ?? ""} maxLength={150} />
        <label htmlFor="rSize">Farm / business size (e.g. 2 acres, 500 trees)</label>
        <input id="rSize" name="farm_size" defaultValue={p?.farm_size ?? ""} maxLength={60} />
        <label htmlFor="rPhoto">Photo for member card</label>
        <input id="rPhoto" name="photo" type="file" accept="image/*" />
        {(!application || application.application_status === "rejected") && <>
          <label htmlFor="rDocuments">Supporting documents (optional)</label>
          <input id="rDocuments" name="documents" type="file" accept="application/pdf,image/jpeg,image/png" multiple />
          <label><input type="checkbox" name="terms" required /> I accept the association’s membership terms.</label>
        </>}
        <Button className="btn btn-forest" type="submit" disabled={busy}>{busy ? "Saving…" : application && application.application_status !== "rejected" ? "Save details" : "Submit registration"}</Button>
        {msg && <p className={`portal-msg${msg.ok ? " ok" : ""}`} role="status">{msg.text}</p>}
      </form>
    </PortalShell>
  );
}
