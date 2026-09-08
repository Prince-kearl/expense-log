import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Check,
  Coins,
  KeyRound,
  LogOut,
  Palette,
  Search,
  Settings as SettingsIcon,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChangePasswordDialog, ThemeToggle, TeamSwitcher } from "@/components/account-controls";
import {
  Card,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  fieldClass,
  labelClass,
} from "@/components/expense-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser, useTeamSettings } from "@/lib/app-data";
import { CURRENCIES, findCurrency } from "@/lib/currencies";
import { initials } from "@/lib/expenses";
import { deleteAccount, updateTeam } from "@/lib/team-api.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CoinTrail" },
      { name: "description", content: "Manage your profile, team, and app preferences." },
    ],
  }),
  component: SettingsPage,
});

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-[17px] font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-[14px] text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doDeleteAccount = useServerFn(deleteAccount);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    setPassword("");
    setConfirmText("");
    setError("");
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await doDeleteAccount({ data: { password } });
      // Session is already cleared server-side — hard redirect so nothing
      // in the app tries to keep using the now-deleted account.
      window.location.assign("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete your account.");
      setIsSubmitting(false);
    }
  }

  const canSubmit = password.length > 0 && confirmText === "DELETE";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Delete Your Account</DialogTitle>
          <DialogDescription>
            This permanently deletes your login and removes you from every team. Time entries you
            logged are deleted too. Expenses you created are kept for your team's records, showing
            your name, but will no longer be linked to an account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Your password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Type DELETE to confirm</label>
            <input
              type="text"
              required
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={fieldClass}
              placeholder="DELETE"
            />
          </div>
          {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
          <DialogFooter>
            <SecondaryButton type="button" onClick={handleClose}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Deleting..." : "Delete my account"}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CurrencyPickerDialog({
  open,
  onClose,
  currentCode,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  currentCode: string;
  onSaved: () => void;
}) {
  const doUpdate = useServerFn(updateTeam);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [savingCode, setSavingCode] = useState<string | null>(null);

  function handleClose() {
    setQuery("");
    setError("");
    setSavingCode(null);
    onClose();
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q),
      )
    : CURRENCIES;

  async function handleSelect(code: string) {
    if (code === currentCode || savingCode) return;
    setSavingCode(code);
    setError("");
    try {
      await doUpdate({ data: { currency: code } });
      onSaved();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update currency.");
      setSavingCode(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Choose Currency</DialogTitle>
          <DialogDescription>
            This becomes the default currency for new expenses your team logs.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search currencies..."
            className={cn(fieldClass, "pl-11")}
            autoFocus
          />
        </div>

        {error ? <p className="text-[13px] text-destructive">{error}</p> : null}

        <div className="-mx-2 max-h-[320px] space-y-0.5 overflow-y-auto px-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-muted-foreground">
              No currencies match &quot;{query}&quot;.
            </p>
          ) : (
            filtered.map((c) => {
              const isSelected = c.code === currentCode;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  disabled={savingCode !== null}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-60"
                >
                  <span className="text-xl">{c.flag}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-foreground">
                      {c.code} <span className="font-normal text-muted-foreground">— {c.name}</span>
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">{c.country}</p>
                  </div>
                  {savingCode === c.code ? (
                    <span className="shrink-0 text-[12px] text-muted-foreground">Saving...</span>
                  ) : isSelected ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <SecondaryButton type="button" onClick={handleClose}>
            Close
          </SecondaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsPage() {
  const currentUser = useCurrentUser();
  const { currency, budgetFeatureEnabled, refetch: refetchTeamSettings } = useTeamSettings();
  const doUpdateTeam = useServerFn(updateTeam);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [isTogglingBudget, setIsTogglingBudget] = useState(false);
  const isOwner = currentUser?.role === "owner";
  const currentCurrency = findCurrency(currency);

  async function handleToggleBudgetFeature(next: boolean) {
    setIsTogglingBudget(true);
    try {
      await doUpdateTeam({ data: { budgetFeatureEnabled: next } });
      refetchTeamSettings();
    } catch {
      // Switch just snaps back to the last known server state on refetch/re-render.
    } finally {
      setIsTogglingBudget(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        subtitle="Your profile, team, and app preferences."
        icon={<SettingsIcon className="h-4 w-4" />}
        overlapNext
      />

      <div className="space-y-5">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-primary">
              {currentUser ? initials(currentUser.name) : "..."}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold text-foreground">
                {currentUser?.name ?? "Loading account"}
              </p>
              <p className="truncate text-[14px] text-muted-foreground">
                {currentUser?.email ?? ""}
              </p>
            </div>
          </div>
        </Card>

        <SectionCard
          title="Team"
          description="Switch between teams you belong to, or start a new one."
        >
          <TeamSwitcher currentUser={currentUser} />
          <Link
            to="/team"
            className="mt-4 flex items-center gap-2 text-[14px] font-medium text-primary hover:underline"
          >
            <Users className="h-4 w-4" />
            Manage members &amp; invitations
          </Link>
        </SectionCard>

        {isOwner ? (
          <SectionCard
            title="Currency"
            description="The default currency used for new expenses your team logs."
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{currentCurrency?.flag ?? "💱"}</span>
                <div>
                  <p className="text-[15px] font-medium text-foreground">
                    {currency}
                    {currentCurrency ? ` — ${currentCurrency.name}` : ""}
                  </p>
                  {currentCurrency ? (
                    <p className="text-[13px] text-muted-foreground">{currentCurrency.country}</p>
                  ) : null}
                </div>
              </div>
              <SecondaryButton
                type="button"
                onClick={() => setCurrencyOpen(true)}
                className="gap-2"
              >
                <Coins className="h-4 w-4" />
                Change
              </SecondaryButton>
            </div>
          </SectionCard>
        ) : null}

        {isOwner ? (
          <SectionCard
            title="Budget"
            description="Show budget tracking and the budget KPI card throughout the app."
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <p className="text-[15px] font-medium text-foreground">
                  {budgetFeatureEnabled ? "Budget feature is on" : "Budget feature is off"}
                </p>
              </div>
              <Switch
                checked={budgetFeatureEnabled}
                disabled={isTogglingBudget}
                onCheckedChange={handleToggleBudgetFeature}
                aria-label="Toggle budget feature"
              />
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title="Appearance" description="Choose how CoinTrail looks on this device.">
          <div className="flex items-center gap-3">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <ThemeToggle />
          </div>
        </SectionCard>

        <SectionCard title="Security" description="Manage your password.">
          <SecondaryButton
            type="button"
            onClick={() => setChangePasswordOpen(true)}
            className="gap-2"
          >
            <KeyRound className="h-4 w-4" />
            Change password
          </SecondaryButton>
        </SectionCard>

        <SectionCard title="Account">
          <a
            href="/api/auth/signout"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-[15px] font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </a>
        </SectionCard>

        <SectionCard
          title="Danger Zone"
          description="Permanently delete your account and remove yourself from every team."
        >
          <SecondaryButton
            type="button"
            onClick={() => setDeleteAccountOpen(true)}
            className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <AlertTriangle className="h-4 w-4" />
            Delete account
          </SecondaryButton>
        </SectionCard>
      </div>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
      <DeleteAccountDialog open={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} />
      <CurrencyPickerDialog
        open={currencyOpen}
        onClose={() => setCurrencyOpen(false)}
        currentCode={currency}
        onSaved={refetchTeamSettings}
      />
    </AppShell>
  );
}
