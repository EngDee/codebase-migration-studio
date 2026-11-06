import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PortalShell } from "@/components/PortalShell";
import { getMyRoles, hasStaffRole, MEMBER_TYPES, photoUrl } from "@/lib/members";
import { getAdministration, reviewApplication } from "@/lib/membership.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const roles = await getMyRoles(context.user.id);
    if (!hasStaffRole(roles)) throw redirect({ to: "/membership" });
  },
  head: () => ({
    meta: [
      { title: "Admin — CCAK" },
      { name: "description", content: "Review member applications and enquiries." },
      { property: "og:title", content: "Admin — CCAK" },
      { property: "og:description", content: "CCAK staff dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Tab = "members" | "inquiries" | "newsletter";

function Admin() {
  const [tab, setTab] = useState<Tab>("members");
  const [members, setMembers] = useState<Tables<"profiles">[]>([]);
  const [inquiries, setInquiries] = useState<Tables<"inquiries">[]>([]);
  const [subs, setSubs] = useState<Tables<"newsletter_subscribers">[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [applications, setApplications] = useState<Tables<"membership_applications">[]>([]);
  const [message, setMessage] = useState("");
  const fetchAdmin = useServerFn(getAdministration);
  const review = useServerFn(reviewApplication);

  const load = async () => {
    try {
      const data = await fetchAdmin();
      setMembers(data.members); setApplications(data.applications); setInquiries(data.inquiries); setSubs(data.subscribers);
    } catch { setMessage("Could not load administration records. Please refresh and try again."); }
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: "approved" | "rejected" | "pending") => {
    const application = applications.find((a) => a.applicant_user_id === id && a.application_status === "pending");
    if (!application || status === "pending") { setMessage("No pending application is available to review."); return; }
    const notes = status === "rejected" ? window.prompt("Reason for rejection") : "";
    if (notes === null) return;
    if (status === "rejected" && !notes?.trim()) { setMessage("A rejection reason is required."); return; }
    try {
      await review({ data: { application_id: application.id, decision: status, notes: notes ?? "" } });
      setMessage("The application decision has been saved.");
      await load();
    } catch { setMessage("The decision was not saved. Check your permissions and refresh before trying again."); }
  };

  const shown = members.filter((m) => m.submitted_at && (filter === "all" || m.status === filter));

  return (
    <PortalShell isAdmin>
      <h1>Admin</h1>
      {message && <p role="status">{message}</p>}
      <div className="admin-tabs">
        <button className={tab === "members" ? "on" : ""} onClick={() => setTab("members")}>Members ({members.filter((m) => m.submitted_at && m.status === "pending").length} pending)</button>
        <button className={tab === "inquiries" ? "on" : ""} onClick={() => setTab("inquiries")}>Partner & donate ({inquiries.length})</button>
        <button className={tab === "newsletter" ? "on" : ""} onClick={() => setTab("newsletter")}>Newsletter ({subs.length})</button>
      </div>

      {tab === "members" && (
        <>
          <div className="admin-filter">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          {shown.length === 0 && <p>No applications here.</p>}
          {shown.map((m) => <MemberRow key={m.id} m={m} onStatus={setStatus} />)}
        </>
      )}

      {tab === "inquiries" && (
        <div className="admin-table">
          {inquiries.length === 0 && <p>No enquiries yet.</p>}
          {inquiries.map((q) => (
            <div key={q.id} className="admin-row">
              <strong>{q.kind === "partner" ? "Partner" : "Donation"} · {q.full_name}</strong>
              <div>{q.email} {q.phone && `· ${q.phone}`} {q.county && `· ${q.county}`}</div>
              {q.message && <p>{q.message}</p>}
              <small>{new Date(q.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}

      {tab === "newsletter" && (
        <div className="admin-table">
          {subs.length === 0 && <p>No subscribers yet.</p>}
          {subs.map((s) => <div key={s.id} className="admin-row">{s.email} <small>· {new Date(s.created_at).toLocaleDateString()}</small></div>)}
        </div>
      )}
    </PortalShell>
  );
}

function MemberRow({ m, onStatus }: { m: Tables<"profiles">; onStatus: (id: string, s: "approved" | "rejected" | "pending") => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => { photoUrl(m.photo_path).then(setPhoto); }, [m.photo_path]);
  return (
    <div className="admin-row member-row">
      <div className="member-photo">{photo ? <img src={photo} alt="" /> : <span>{(m.full_name ?? "?")[0]}</span>}</div>
      <div className="grow">
        <strong>{m.full_name}</strong> <span className={`status status-${m.status}`}>{m.status}{m.member_no ? ` · ${m.member_no}` : ""}</span>
        <div>{MEMBER_TYPES.find(([v]) => v === m.member_type)?.[1]} · {m.county} · {m.phone} · {m.email}</div>
        {(m.business_name || m.farm_size) && <div>{m.business_name} {m.farm_size && `(${m.farm_size})`}</div>}
      </div>
      <div className="row-actions">
        {m.status === "pending" && <Button className="btn btn-forest btn-compact" onClick={() => onStatus(m.id, "approved")}>Approve</Button>}
        {m.status === "pending" && <Button className="btn btn-ghost btn-compact" onClick={() => onStatus(m.id, "rejected")}>Reject</Button>}
      </div>
    </div>
  );
}
