import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PrimaryButton, fieldClass, labelClass } from "@/components/expense-ui";
import { confirmPasswordReset, requestPasswordReset } from "@/lib/team-api.functions";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => {
    const code = typeof search["code"] === "string" ? search["code"] : undefined;
    return code ? { code } : {};
  },
  head: () => ({
    meta: [{ title: "Reset your password — CoinTrail" }],
  }),
  component: ResetPasswordPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-page px-6">
      <div
        className="pointer-events-none absolute top-[-120px] left-1/2 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div className="relative w-full max-w-[420px] card-surface p-10 text-center shadow-elevated">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo-primary.png" alt="CoinTrail" className="h-16 w-auto" />
        </div>
        {children}
      </div>
    </div>
  );
}

function ResetPasswordPage() {
  const { code } = Route.useSearch();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [checkedHash, setCheckedHash] = useState(false);

  // Supabase's recovery link can arrive either as ?code=... (PKCE) or as a
  // #access_token=...&type=recovery URL fragment (implicit flow) — fragments
  // are never sent to the server, so we can only read this client-side.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("type") === "recovery") {
      setAccessToken(hash.get("access_token"));
    }
    setCheckedHash(true);
  }, []);

  if (!checkedHash) {
    return (
      <Shell>
        <p className="mt-6 text-[15px] text-muted-foreground">Loading...</p>
      </Shell>
    );
  }

  if (code || accessToken) {
    return (
      <Shell>
        <SetNewPasswordForm code={code} accessToken={accessToken ?? undefined} />
      </Shell>
    );
  }

  return (
    <Shell>
      <RequestResetForm />
    </Shell>
  );
}

function RequestResetForm() {
  const doRequest = useServerFn(requestPasswordReset);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await doRequest({ data: { email } });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <>
        <h1 className="mt-6 text-[19px] font-semibold text-foreground">Check your email</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, we've sent a link
          to reset your password.
        </p>
        <Link to="/login" className="mt-6 inline-block text-[14px] font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mt-6 text-[19px] font-semibold text-foreground">Forgot your password?</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">
        Enter your email and we'll send you a link to reset it.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </div>
        {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
        <PrimaryButton type="submit" disabled={isSubmitting} className="w-full justify-center">
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-[13px] text-muted-foreground">
        Remembered it?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

function SetNewPasswordForm({
  code,
  accessToken,
}: {
  code: string | undefined;
  accessToken: string | undefined;
}) {
  const doConfirm = useServerFn(confirmPasswordReset);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const result = await doConfirm({ data: { newPassword: password, code, accessToken } });
      window.location.assign(result.signedIn ? "/dashboard" : "/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset your password.");
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mt-6 text-[19px] font-semibold text-foreground">Set a new password</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Choose a new password for your account.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
        <div>
          <label className={labelClass}>New password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={fieldClass}
          />
        </div>
        {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
        <PrimaryButton type="submit" disabled={isSubmitting} className="w-full justify-center">
          {isSubmitting ? "Saving..." : "Save New Password"}
        </PrimaryButton>
      </form>
    </>
  );
}
