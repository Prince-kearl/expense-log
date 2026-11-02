import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your account — CoinTrail" },
      { name: "description", content: "How to delete your CoinTrail account and what data is removed." },
      { property: "og:title", content: "Delete your account — CoinTrail" },
      { property: "og:description", content: "How to delete your CoinTrail account and what data is removed." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Link to="/login" className="text-sm font-medium text-primary">← Back to CoinTrail</Link>
      <h1 className="mt-6 text-3xl font-bold text-foreground">Delete your CoinTrail account</h1>

      <h2 className="mt-8 text-lg font-semibold text-foreground">In the app</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
        <li>Sign in to CoinTrail.</li>
        <li>Open <strong>Settings</strong>.</li>
        <li>Tap <strong>Delete account</strong> and confirm with your password.</li>
      </ol>
      <div className="mt-4">
        <Link to="/settings" className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to Settings</Link>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-foreground">Can't sign in?</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Email <a className="text-primary underline" href="mailto:privacy@teamtrails.app?subject=Delete%20my%20CoinTrail%20account">privacy@teamtrails.app</a> from your account's email address and we'll delete it within 30 days.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-foreground">What gets deleted</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Your sign-in, profile, name and email, and your team memberships are removed. Expense records your team needs for its accounts may be kept with your name removed, for up to the period your organisation is legally required to retain financial records.
      </p>
    </main>
  );
}
