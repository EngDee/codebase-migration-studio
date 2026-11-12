import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { isPasswordRecovery } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — CCAK" },
      { name: "description", content: "Choose a new password for your CCAK member account." },
      { property: "og:title", content: "Reset password — CCAK" },
      { property: "og:description", content: "Choose a new password for your CCAK member account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (isPasswordRecovery(window.location.hash)) sessionStorage.setItem("ccak-password-recovery", "true");
    void supabase.auth.getUser().then(({ data }) => setRecovery(Boolean(data.user) && sessionStorage.getItem("ccak-password-recovery") === "true"));
  }, []);
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!recovery) return setMsg("Open the password reset link from your email first.");
    const password = String(new FormData(e.currentTarget).get("password"));
    if (password.length < 8) return setMsg("Password must be at least 8 characters.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      sessionStorage.removeItem("ccak-password-recovery");
      await navigate({ to: "/membership", replace: true });
    } catch (error) { setMsg(error instanceof Error ? error.message : "Password could not be saved. Please try again."); }
    finally { setBusy(false); }
  };
  return (
    <div className="portal auth-page">
      <div className="auth-card">
        <h1>Set a new password</h1>
        <form onSubmit={onSubmit} className="portal-form">
          <label htmlFor="newPass">New password</label>
          <input id="newPass" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <Button className="btn btn-forest" type="submit" disabled={busy || !recovery}>{busy ? "Saving…" : "Save password"}</Button>
        </form>
        {msg && <p className="portal-msg" role="status">{msg}</p>}
      </div>
    </div>
  );
}
