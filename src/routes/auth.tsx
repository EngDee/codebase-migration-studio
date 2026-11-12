import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { accountSchema, confirmationUrl } from "@/lib/auth";
import { useAccount } from "@/hooks/use-account";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import ccakLogo from "@/assets/ccak-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "signup" } => (s["mode"] === "signup" ? { mode: "signup" } : {}),
  head: () => ({
    meta: [
      { title: "Member sign in — CCAK" },
      { name: "description", content: "Sign in or create your Coffee Champions Association of Kenya member account." },
      { property: "og:title", content: "Member sign in — CCAK" },
      { property: "og:description", content: "Sign in or join the Coffee Champions Association of Kenya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [signup, setSignup] = useState(mode === "signup");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: user } = useAccount();

  useEffect(() => {
    setSignup(mode === "signup");
  }, [mode]);
  useEffect(() => {
    if (user) void navigate({ to: "/membership", replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = accountSchema.safeParse(fd);
    if (!parsed.success) return setMsg({ text: parsed.error.issues[0]?.message ?? "Check your account details." });
    setBusy(true); setMsg(null);
    const { email, password, full_name } = parsed.data;
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: confirmationUrl(window.location.origin), data: { full_name } },
        });
        if (error) throw error;
        if (data.session) await navigate({ to: "/membership", replace: true });
        else setMsg({ ok: true, text: "Check your email to confirm your account, then sign in. If you already have an account, use Sign in or Forgot password." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await navigate({ to: "/membership", replace: true });
      }
    } catch (error) {
      setMsg({ text: error instanceof Error ? error.message : "Could not connect. Please try again." });
    } finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: confirmationUrl(window.location.origin) });
      if (r.error) setMsg({ text: "Google sign-in failed. Please try again." });
    } catch { setMsg({ text: "Google sign-in could not connect. Please try again." }); }
    finally { setBusy(false); }
  };

  const forgot = async () => {
    const input = document.getElementById("authEmail");
    const email = input instanceof HTMLInputElement ? input.value.trim() : "";
    if (!z.string().email().safeParse(email).success) return setMsg({ text: "Enter your email above first." });
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      setMsg({ ok: true, text: "If that email has an account, a reset link is on its way." });
    } catch (error) { setMsg({ text: error instanceof Error ? error.message : "Reset email could not be sent. Please try again." }); }
    finally { setBusy(false); }
  };

  return (
    <div className="portal auth-page">
      <div className="auth-card">
        <img src={ccakLogo.url} alt="CCAK logo" className="auth-logo" />
        <h1>{signup ? "Join CCAK" : "Member sign in"}</h1>
        <p className="sub">{signup ? "Create your account, then complete your membership registration." : "Welcome back, coffee champion."}</p>
        <Button type="button" variant="ghost" disabled={busy} className="btn btn-ghost auth-google" onClick={google}>Continue with Google</Button>
        <div className="auth-or"><span>or</span></div>
        <form onSubmit={onSubmit} className="portal-form">
          {signup && (<><label htmlFor="authName">Full name</label><input id="authName" name="full_name" autoComplete="name" required /></>)}
          <label htmlFor="authEmail">Email</label>
          <input id="authEmail" name="email" type="email" autoComplete="email" required />
          <label htmlFor="authPass">Password</label>
          <input id="authPass" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={8} />
          <Button className="btn btn-forest" type="submit" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</Button>
        </form>
        {msg && <p className={`portal-msg${msg.ok ? " ok" : ""}`} role="status">{msg.text}</p>}
        <p className="auth-switch">
          {signup ? "Already a member? " : "New to CCAK? "}
          <Button variant="link" disabled={busy} type="button" onClick={() => { setSignup(!signup); setMsg(null); }}>{signup ? "Sign in" : "Create an account"}</Button>
          {!signup && <> · <Button variant="link" disabled={busy} type="button" onClick={forgot}>Forgot password?</Button></>}
        </p>
      </div>
    </div>
  );
}
