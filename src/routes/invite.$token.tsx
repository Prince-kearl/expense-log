import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton, fieldClass, labelClass } from "@/components/expense-ui";
import { createAccountFromInvitation, getInvitationDetails, respondToInvitation } from "@/lib/team-api.functions";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [{ title: "You've been invited — CoinTrail" }],
  }),
  component: InvitePage,
});

type InvitationDetails = Awaited<ReturnType<typeof getInvitationDetails>>;

function Shell({ children }: { children: React.ReactNode }) {
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
        {children}
      </div>
    </div>
  );
}

function InvitePage() {
  const { token } = Route.useParams();
  const fetchDetails = useServerFn(getInvitationDetails);
  const [details, setDetails] = useState<InvitationDetails | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDetails({ data: { token } })
      .then((result) => {
        if (!cancelled) setDetails(result);
      })
      .catch(() => {
        if (!cancelled) setDetails({ status: "not_found" });
      });
    return () => {
      cancelled = true;
    };
  }, [token, fetchDetails]);

  if (!details) {
    return (
      <Shell>
        <p className="mt-6 text-[15px] text-muted-foreground">Loading invitation...</p>
      </Shell>
    );
  }

  if (details.status === "not_found") {
    return (
      <Shell>
        <h1 className="mt-6 text-[19px] font-semibold text-foreground">Invitation not found</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          This invitation link doesn&apos;t exist or has already been used.
        </p>
        <Link to="/login" className="mt-6 inline-block text-[14px] font-medium text-primary hover:underline">
          Go to sign in
        </Link>
      </Shell>
    );
  }

  if (details.status === "expired") {
    return (
      <Shell>
        <h1 className="mt-6 text-[19px] font-semibold text-foreground">Invitation expired</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          This invitation has expired. Ask a team member to send you a new one.
        </p>
      </Shell>
    );
  }

  if (details.status !== "pending") {
    return (
      <Shell>
        <h1 className="mt-6 text-[19px] font-semibold text-foreground">Invitation no longer available</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          This invitation has already been {details.status}.
        </p>
      </Shell>
    );
  }

  if (!details.hasAccount) {
    return (
      <Shell>
        <NewAccountForm token={token} email={details.email} teamName={details.teamName} />
      </Shell>
    );
  }

  if (details.viewerMatches) {
    return (
      <Shell>
        <AcceptDeclineCard token={token} invitedByName={details.invitedByName} teamName={details.teamName} />
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mt-6 text-[19px] font-semibold text-foreground">Sign in to accept</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">
        This invitation was sent to <span className="font-medium text-foreground">{details.email}</span>. Sign in
        with that account to accept it.
      </p>
      <Link
        to="/login"
        search={{ redirect: `/invite/${token}` }}
        className="mt-6 inline-block"
      >
        <PrimaryButton type="button">Sign in</PrimaryButton>
      </Link>
    </Shell>
  );
}

function NewAccountForm({ token, email, teamName }: { token: string; email: string; teamName: string }) {
  const doCreateAccount = useServerFn(createAccountFromInvitation);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await doCreateAccount({ data: { token, name, password } });
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to join the team.");
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mt-6 text-[19px] font-semibold text-foreground">You&apos;ve been invited!</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">
        Join <span className="font-medium text-foreground">{teamName}</span>
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={email} disabled className={fieldClass + " opacity-60"} />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
        </div>
        {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
        <PrimaryButton type="submit" disabled={isSubmitting} className="w-full justify-center">
          {isSubmitting ? "Joining..." : "Join Team"}
        </PrimaryButton>
      </form>
    </>
  );
}

function AcceptDeclineCard({
  token,
  invitedByName,
  teamName,
}: {
  token: string;
  invitedByName: string;
  teamName: string;
}) {
  const doRespond = useServerFn(respondToInvitation);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function respond(accept: boolean) {
    setIsSubmitting(true);
    setError("");
    try {
      await doRespond({ data: { token, accept } });
      window.location.assign(accept ? "/dashboard" : "/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mt-6 text-[19px] font-semibold text-foreground">
        {invitedByName} invited you to join
      </h1>
      <p className="mt-1.5 text-[17px] font-semibold text-foreground">&quot;{teamName}&quot;</p>
      {error ? <p className="mt-4 text-[13px] text-destructive">{error}</p> : null}
      <div className="mt-8 flex flex-col gap-3">
        <PrimaryButton type="button" disabled={isSubmitting} onClick={() => respond(true)} className="w-full justify-center">
          Accept Invitation
        </PrimaryButton>
        <SecondaryButton type="button" disabled={isSubmitting} onClick={() => respond(false)} className="w-full justify-center">
          Decline
        </SecondaryButton>
      </div>
    </>
  );
}
