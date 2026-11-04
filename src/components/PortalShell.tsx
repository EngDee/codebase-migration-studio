import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import ccakLogo from "@/assets/ccak-logo.png.asset.json";

export function PortalShell({ children, isAdmin }: { children: ReactNode; isAdmin?: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="portal">
      <header className="portal-top">
        <Link to="/" className="logo">
          <img className="logo-mark" src={ccakLogo.url} alt="CCAK logo" />
          <span className="logo-text"><strong>Coffee Champions</strong><small>Association of Kenya</small></span>
        </Link>
        <nav className="portal-nav">
          <Link to="/membership">My membership</Link>
          {isAdmin && <Link to="/admin">Admin</Link>}
          <button className="btn btn-ghost btn-compact" onClick={signOut}>Sign out</button>
        </nav>
      </header>
      <main className="portal-main">{children}</main>
    </div>
  );
}
