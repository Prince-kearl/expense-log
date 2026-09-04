import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PrimaryButton, fieldClass, labelClass } from "@/components/expense-ui";
import { signUp } from "@/lib/team-api.functions";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — CoinTrail" },
      { name: "description", content: "Create your CoinTrail account and set up your team." },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const doSignUp = useServerFn(signUp);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await doSignUp({ data: { name, email, password, teamName } });
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-page px-6 py-10">
      <div
        className="pointer-events-none absolute top-[-120px] left-1/2 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-[440px] card-surface p-10 text-center shadow-elevated">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo-primary.png" alt="CoinTrail" className="h-16 w-auto" />
        </div>

        <h1 className="mt-6 text-[19px] font-semibold text-foreground">Welcome to CoinTrail</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">Create your account</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
          <div>
            <label className={labelClass}>Full name</label>
            <input
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prince Keteni"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prince@email.com"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
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
          <div>
            <label className={labelClass}>Team name</label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="My Team"
              className={fieldClass}
            />
          </div>
          {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
          <PrimaryButton type="submit" disabled={isSubmitting} className="w-full justify-center">
            {isSubmitting ? "Creating team..." : "Create Team"}
          </PrimaryButton>
        </form>

        <p className="mt-6 text-[13px] text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
