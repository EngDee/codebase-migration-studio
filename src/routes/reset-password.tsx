import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    if (password.length < 8) return setMsg("Password must be at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMsg(error.message);
    navigate({ to: "/membership" });
  };
  return (
    <div className="portal auth-page">
      <div className="auth-card">
        <h1>Set a new password</h1>
        <form onSubmit={onSubmit} className="portal-form">
          <label htmlFor="newPass">New password</label>
          <input id="newPass" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <button className="btn btn-forest" type="submit">Save password</button>
        </form>
        {msg && <p className="portal-msg" role="status">{msg}</p>}
      </div>
    </div>
  );
}
