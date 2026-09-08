import { useServerFn } from "@tanstack/react-start";
import { Check, Monitor, Moon, Plus, Sun } from "lucide-react";
import { useState } from "react";
import { PrimaryButton, SecondaryButton, fieldClass, labelClass } from "@/components/expense-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser, useMyTeamMemberships } from "@/lib/app-data";
import { changePassword, createAdditionalTeam, switchActiveTeam } from "@/lib/team-api.functions";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: Theme; icon: typeof Monitor; label: string }[] = [
  { value: "system", icon: Monitor, label: "Use system theme" },
  { value: "light", icon: Sun, label: "Use light theme" },
  { value: "dark", icon: Moon, label: "Use dark theme" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1">
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-label={option.label}
            aria-pressed={active}
            className={cn(
              "flex h-8 w-10 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doChangePassword = useServerFn(changePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    setCurrentPassword("");
    setNewPassword("");
    setError("");
    setSuccess(false);
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await doChangePassword({ data: { currentPassword, newPassword } });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change your password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>
        {success ? (
          <>
            <p className="text-[14px] text-success">Your password has been changed.</p>
            <DialogFooter>
              <SecondaryButton type="button" onClick={handleClose}>
                Close
              </SecondaryButton>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Current password</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>New password</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={fieldClass}
              />
            </div>
            {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
            <DialogFooter>
              <SecondaryButton type="button" onClick={handleClose}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </PrimaryButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CreateTeamDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doCreateTeam = useServerFn(createAdditionalTeam);
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    setTeamName("");
    setError("");
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await doCreateTeam({ data: { teamName } });
      // A hard reload — not a client-side navigate — because this dialog is
      // reachable from every page, including /dashboard itself. Navigating to
      // a route you're already on is a no-op, which left the screen showing
      // the old team's data until a manual refresh.
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create team.");
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Create a New Team</DialogTitle>
          <DialogDescription>You'll become the owner of this new team.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Team name</label>
            <input
              type="text"
              required
              autoFocus
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className={fieldClass}
            />
          </div>
          {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
          <DialogFooter>
            <SecondaryButton type="button" onClick={handleClose}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create team"}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Team switcher + "create new team". Shared by the account-menu dropdown
 * (compact, quick-access) and the full Settings page (same behavior, more
 * breathing room) so the switching/creation logic only lives in one place.
 */
export function TeamSwitcher({ currentUser }: { currentUser: ReturnType<typeof useCurrentUser> }) {
  const memberships = useMyTeamMemberships();
  const doSwitchTeam = useServerFn(switchActiveTeam);
  const [switchingTeamId, setSwitchingTeamId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function handleSwitch(teamId: string) {
    if (teamId === currentUser?.team_id || switchingTeamId) return;
    setSwitchingTeamId(teamId);
    try {
      await doSwitchTeam({ data: { teamId } });
      // Hard reload — see CreateTeamDialog for why.
      window.location.assign("/dashboard");
    } catch {
      setSwitchingTeamId(null);
    }
  }

  return (
    <div>
      {memberships.length > 1 ? (
        <div className="space-y-0.5">
          {memberships.map((membership) => (
            <button
              key={membership.team_id}
              type="button"
              onClick={() => handleSwitch(membership.team_id)}
              disabled={switchingTeamId !== null}
              className="flex h-9 w-full items-center justify-between rounded-lg px-2 text-left transition-colors hover:bg-muted disabled:opacity-60"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    membership.isActive ? "text-primary" : "text-transparent",
                  )}
                />
                <span className="truncate text-[14px] text-foreground">{membership.team_name}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground capitalize">
                {membership.role}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="truncate text-[14px] text-foreground">{currentUser?.team_name ?? ""}</p>
      )}

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="mt-1.5 flex h-9 w-full items-center gap-3 text-left text-[14px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Create new team
      </button>

      <CreateTeamDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
