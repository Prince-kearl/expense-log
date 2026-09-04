import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PrimaryButton, fieldClass, labelClass } from "@/components/expense-ui";
import { signIn } from "@/lib/team-api.functions";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => {
    const redirect = typeof search["redirect"] === "string" ? search["redirect"] : undefined;
    return redirect ? { redirect } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — CoinTrail" },
      { name: "description", content: "Sign in to record and track your organization's expenses." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const doSignIn = useServerFn(signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await doSignIn({ data: { email, password } });
      window.location.assign(redirect ?? "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-page px-6">
      <div
        className="pointer-events-none absolute top-[-120px] left-1/2 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-[420px] card-surface p-10 text-center shadow-elevated">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo-primary.png" alt="CoinTrail" className="h-20 w-auto" />
          <span className="text-[15px] font-normal tracking-tight text-foreground">CoinTrail</span>
        </div>

        <h1 className="mt-6 text-[19px] font-semibold text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Sign in to record and track your organization&apos;s expenses.
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
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass}>Password</label>
              <Link to="/reset-password" className="mb-2 text-[13px] font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
          </div>
          {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
          <PrimaryButton type="submit" disabled={isSubmitting} className="w-full justify-center">
            {isSubmitting ? "Signing in..." : "Sign In"}
          </PrimaryButton>
        </form>

        <p className="mt-6 text-[13px] text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create a team
          </Link>
        </p>
      </div>
    </div>
  );
}
