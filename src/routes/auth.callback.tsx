import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { finishOAuthSignIn } from "@/lib/team-api.functions";
import { safeAuthRedirect } from "@/lib/auth-redirect";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [
    { title: "Google sign-in — CoinTrail" },
    { name: "description", content: "Complete your secure Google sign-in to CoinTrail." },
    { property: "og:title", content: "Google sign-in — CoinTrail" },
    { property: "og:description", content: "Complete your secure Google sign-in to CoinTrail." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthCallback,
});

function AuthCallback() {
  const finish = useServerFn(finishOAuthSignIn);
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function complete() {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session) throw new Error("No sign-in session was found. Please try signing in again.");
        // Remove callback credentials from the visible URL before continuing.
        window.history.replaceState(null, "", "/auth/callback");
        await finish({ headers: { Authorization: `Bearer ${data.session.access_token}` } });
        const destination = safeAuthRedirect(sessionStorage.getItem("cointrail-oauth-redirect"));
        sessionStorage.removeItem("cointrail-oauth-redirect");
        await supabase.auth.signOut({ scope: "local" });
        window.location.assign(destination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to complete Google sign-in.");
      }
    }
    void complete();
  }, [finish]);
  return <main className="flex min-h-screen items-center justify-center bg-page px-6">
    <div className="max-w-md text-center">
      <img src="/logo-primary.png" alt="CoinTrail" className="mx-auto h-20 w-auto" />
      <h1 className="mt-6 text-xl font-semibold">{error ? "Sign-in could not finish" : "Signing you in…"}</h1>
      {error ? <><p role="alert" className="mt-3 text-sm text-destructive">{error}</p><Link to="/login" className="mt-5 inline-block text-primary underline">Back to sign in</Link></> : null}
    </div>
  </main>;
}