import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CoinTrail" },
      { name: "description", content: "How CoinTrail collects, uses and protects your data." },
      { property: "og:title", content: "Privacy Policy — CoinTrail" },
      { property: "og:description", content: "How CoinTrail collects, uses and protects your data." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Link to="/login" className="text-sm font-medium text-primary">← Back to CoinTrail</Link>
      <h1 className="mt-6 text-3xl font-bold text-foreground">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: November 2, 2026</p>

      <Section title="Who we are">
        <p>CoinTrail is an internal expense, time and budget tracking app for teams. This policy explains what data the app handles and why.</p>
      </Section>
      <Section title="Data we collect">
        <p><strong>Account data:</strong> your name, email address and an encrypted password.</p>
        <p><strong>Work data you enter:</strong> expenses, amounts, categories, notes, budgets, time entries and team membership.</p>
        <p><strong>Receipts:</strong> images or files you upload as proof of an expense.</p>
        <p>We do not collect location, contacts, advertising IDs, or device data beyond what is needed to keep you signed in.</p>
      </Section>
      <Section title="Google sign-in">
        <p>If you choose to sign in with Google, Google shares your name, email address and profile picture with CoinTrail. We use these only to create and identify your account.</p>
        <p>We do not access your Gmail, Google Drive, contacts, calendar or any other Google data, and we never post on your behalf. You can revoke CoinTrail's access at any time from your Google Account's security settings.</p>
      </Section>
      <Section title="Expense data">
        <p>Expenses you record (amount, currency, date, category, description and notes) are stored in our secure database and linked to your team. They are used to show dashboards, reports, budgets and exports to members of your team.</p>
      </Section>
      <Section title="Receipt storage">
        <p>Receipt images and files are kept in private, encrypted cloud storage. They are not publicly accessible: each download is checked against your team membership on the server. Receipts are deleted when the expense or your team's data is removed.</p>
      </Section>
      <Section title="How we use it">
        <p>Only to run the app: sign you in, show your team's expenses and reports, and send password-reset or invitation emails. We do not sell data, show ads, or share data with third parties for marketing.</p>
      </Section>
      <Section title="Sharing">
        <p>Data you enter is visible to members of your team according to their role. Our hosting and database providers process data on our behalf to operate the service.</p>
      </Section>
      <Section title="Security">
        <p>All traffic is encrypted (HTTPS). Passwords are hashed, receipts are kept in private storage, and every request checks your team membership on the server.</p>
      </Section>
      <Section title="Retention and deletion">
        <p>Data is kept while your account is active. You can delete your account at any time in <strong>Settings → Delete account</strong>, or follow the steps on our <Link to="/delete-account" className="text-primary underline">account deletion page</Link>. Your account and personal data are removed when you delete it.</p>
      </Section>
      <Section title="Children">
        <p>CoinTrail is a workplace tool and is not directed at children under 13.</p>
      </Section>
      <Section title="Contact">
        <p>Questions about privacy: <a className="text-primary underline" href="mailto:privacy@teamtrails.app">privacy@teamtrails.app</a></p>
      </Section>
    </main>
  );
}
