import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import ccakLogo from "@/assets/ccak-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ mode: s.mode === "signup" ? ("signup" as const) : undefined }),
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

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  full_name: z.string().trim().max(120).optional(),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [signup, setSignup] = useState(mode === "signup");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => data.user && navigate({ to: "/membership" }));
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) navigate({ to: "/membership" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = schema.safeParse(fd);
    if (!parsed.success) return setMsg({ text: parsed.error.issues[0]!.message });
    setBusy(true); setMsg(null);
    const { email, password, full_name } = parsed.data;
    if (signup) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/membership`, data: { full_name } },
      });
      setMsg(error ? { text: error.message } : { ok: true, text: "Check your email to confirm your account, then sign in." });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ text: error.message });
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setMsg({ text: "Google sign-in failed. Please try again." });
  };

  const forgot = async () => {
    const email = (document.getElementById("authEmail") as HTMLInputElement).value;
    if (!z.string().email().safeParse(email).success) return setMsg({ text: "Enter your email above first." });
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setMsg({ ok: true, text: "If that email has an account, a reset link is on its way." });
  };

  return (
    <div className="portal auth-page">
      <div className="auth-card">
        <img src={ccakLogo.url} alt="CCAK logo" className="auth-logo" />
        <h1>{signup ? "Join CCAK" : "Member sign in"}</h1>
        <p className="sub">{signup ? "Create your account, then complete your membership registration." : "Welcome back, coffee champion."}</p>
        <button type="button" className="btn btn-ghost auth-google" onClick={google}>Continue with Google</button>
        <div className="auth-or"><span>or</span></div>
        <form onSubmit={onSubmit} className="portal-form">
          {signup && (<><label htmlFor="authName">Full name</label><input id="authName" name="full_name" autoComplete="name" required /></>)}
          <label htmlFor="authEmail">Email</label>
          <input id="authEmail" name="email" type="email" autoComplete="email" required />
          <label htmlFor="authPass">Password</label>
          <input id="authPass" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={8} />
          <button className="btn btn-forest" type="submit" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</button>
        </form>
        {msg && <p className={`portal-msg${msg.ok ? " ok" : ""}`} role="status">{msg.text}</p>}
        <p className="auth-switch">
          {signup ? "Already a member? " : "New to CCAK? "}
          <button type="button" onClick={() => { setSignup(!signup); setMsg(null); }}>{signup ? "Sign in" : "Create an account"}</button>
          {!signup && <> · <button type="button" onClick={forgot}>Forgot password?</button></>}
        </p>
      </div>
    </div>
  );
}
