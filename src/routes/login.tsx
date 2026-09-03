import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CoinTrail" },
      {
        name: "description",
        content: "Sign in with Google to record and track your organization's expenses.",
      },
      { property: "og:title", content: "Sign in — CoinTrail" },
      {
        property: "og:description",
        content: "Sign in with Google to record and track your organization's expenses.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-page px-6">
      <div
        className="pointer-events-none absolute top-[-120px] left-1/2 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-[420px] card-surface p-10 text-center shadow-elevated">
        <div className="flex flex-col items-center gap-3">
          <img src="/favico.svg" alt="CoinTrail" className="h-20 w-auto" />
          <span className="text-[15px] font-normal tracking-tight text-foreground">CoinTrail</span>
        </div>

        <h1 className="mt-6 text-[19px] font-semibold text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Sign in to record and track your organization&apos;s expenses.
        </p>

        <button
          onClick={() => {
            window.location.assign("/api/auth/google");
          }}
          className="mt-8 inline-flex h-12 w-full items-center justify-center gap-3 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <p className="mt-6 text-[13px] text-muted-foreground">
          Your Google account identifies who records each expense.
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background">
      <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
        <path
          fill="#EA4335"
          d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.7l7.8 6.1C12.3 13.7 17.6 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 7.1-10.2 7.1-17.7z"
        />
        <path
          fill="#FBBC05"
          d="M10.4 28.2a14.6 14.6 0 010-9.3l-7.8-6.1a24 24 0 000 21.5l7.8-6.1z"
        />
        <path
          fill="#34A853"
          d="M24 47.5c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.2-8.3 2.2-6.4 0-11.7-4.2-13.6-10.3l-7.8 6.1C6.5 42.1 14.6 47.5 24 47.5z"
        />
      </svg>
    </span>
  );
}
