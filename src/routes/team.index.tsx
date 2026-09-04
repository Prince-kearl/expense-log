import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, MoreVertical, Share2, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, PageHeader, PrimaryButton, SecondaryButton, fieldClass, labelClass } from "@/components/expense-ui";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/lib/app-data";
import { initials } from "@/lib/expenses";
import {
  getCurrentTeam,
  inviteMember,
  promoteTeamMember,
  removeTeamMember,
  updateTeam,
} from "@/lib/team-api.functions";
import { cn } from "@/lib/utils";

function canShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function CopyLinkButton({ url, label = "Copy Link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await copyText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — nothing to fall back to besides manual selection
    }
  }

  return (
    <SecondaryButton type="button" onClick={handleCopy} className="h-9 gap-2 px-4 text-[14px]">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied!" : label}
    </SecondaryButton>
  );
}

export const Route = createFileRoute("/team/")({
  head: () => ({
    meta: [
      { title: "Team — CoinTrail" },
      { name: "description", content: "Manage who has access to your team's workspace." },
    ],
  }),
  component: TeamPage,
});

type TeamData = Awaited<ReturnType<typeof getCurrentTeam>>;

function TeamPage() {
  const currentUser = useCurrentUser();
  const fetchTeam = useServerFn(getCurrentTeam);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loadError, setLoadError] = useState("");

  function reload() {
    fetchTeam({ data: undefined })
      .then(setTeam)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Unable to load team."));
  }

  useEffect(reload, [fetchTeam]);

  const isOwner = currentUser?.role === "owner";
  const activeMembers = (team?.members ?? []).filter((m) => m.status === "active");

  return (
    <AppShell>
      <PageHeader
        title="Team"
        subtitle="Manage who has access to your team's workspace."
        icon={<Users className="h-4 w-4" />}
        overlapNext
      />

      {loadError ? (
        <Card className="p-5">
          <p className="text-[14px] text-destructive">{loadError}</p>
        </Card>
      ) : !team ? (
        <Card className="p-5">
          <p className="text-[14px] text-muted-foreground">Loading team...</p>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between px-6 py-5">
              <h2 className="text-[17px] font-semibold text-foreground">{team.team.name}</h2>
              <span className="text-[13px] text-muted-foreground">
                {activeMembers.length} {activeMembers.length === 1 ? "member" : "members"}
              </span>
            </div>
            <div className="divide-y divide-border/70">
              {activeMembers.map((member) => (
                <MemberRow
                  key={member.membership_id}
                  member={member}
                  isViewerOwner={isOwner}
                  isSelf={member.user_id === team.currentUserId}
                  onChanged={reload}
                />
              ))}
            </div>
          </Card>

          <InviteForm onInvited={reload} />

          {team.invitations.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="px-6 py-5">
                <h2 className="text-[17px] font-semibold text-foreground">Pending Invitations</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-border text-[13px] text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Invited By</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {team.invitations.map((invitation) => (
                      <tr key={invitation.id} className="border-b border-border/70 last:border-0">
                        <td className="px-6 py-4 text-[15px] text-foreground">{invitation.email}</td>
                        <td className="px-6 py-4 text-[15px] text-foreground">{invitation.invited_by_name}</td>
                        <td className="px-6 py-4 text-[15px] text-muted-foreground capitalize">
                          {invitation.status}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <CopyLinkButton url={`${window.location.origin}/invite/${invitation.token}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {isOwner ? (
            <TeamSettingsCard
              teamName={team.team.name}
              standardHourlyRate={team.team.standard_hourly_rate}
              onSaved={reload}
            />
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

function MemberRow({
  member,
  isViewerOwner,
  isSelf,
  onChanged,
}: {
  member: TeamData["members"][number];
  isViewerOwner: boolean;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const doRemove = useServerFn(removeTeamMember);
  const doPromote = useServerFn(promoteTeamMember);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handlePromote() {
    setIsSubmitting(true);
    setError("");
    try {
      await doPromote({ data: { userId: member.user_id } });
      setMenuOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to promote member.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove() {
    setIsSubmitting(true);
    setError("");
    try {
      await doRemove({ data: { userId: member.user_id } });
      setConfirmingRemove(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove member.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-3">
        <Link
          to="/team/$userId"
          params={{ userId: member.user_id }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary transition-transform hover:scale-105"
        >
          {initials(member.name)}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-foreground">
            {member.name} {isSelf ? <span className="text-muted-foreground">(you)</span> : null}
          </p>
          <p className="truncate text-[13px] text-muted-foreground">{member.email}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-[12px] font-medium",
            member.role === "owner" ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {member.role === "owner" ? "Team Owner" : "Team Member"}
        </span>
        {isViewerOwner && !isSelf ? (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Member actions"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                <div className="absolute top-9 right-0 z-20 w-52 rounded-2xl border border-border bg-card p-1.5 text-left shadow-card">
                  {member.role !== "owner" ? (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handlePromote}
                      className="flex w-full items-center rounded-xl px-3 py-2 text-left text-[14px] text-foreground hover:bg-muted"
                    >
                      Promote to Owner
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmingRemove(true);
                    }}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-[14px] text-destructive hover:bg-destructive/10"
                  >
                    Remove from Team
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-[13px] text-destructive">{error}</p> : null}
      {confirmingRemove ? (
        <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-[14px] text-foreground">
            Remove {member.name} from the team? {member.name} will no longer be able to access this team&apos;s
            workspace. {member.name.split(" ")[0]}&apos;s previous expenses and time logs will remain in the
            team&apos;s records.
          </p>
          <div className="mt-3 flex gap-2">
            <SecondaryButton
              type="button"
              onClick={() => setConfirmingRemove(false)}
              className="h-9 px-4 text-[14px]"
            >
              Cancel
            </SecondaryButton>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRemove}
              className="inline-flex h-9 items-center rounded-full bg-destructive px-4 text-[14px] font-semibold text-destructive-foreground disabled:opacity-60"
            >
              {isSubmitting ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const doInvite = useServerFn(inviteMember);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ email: string; inviteUrl: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const result = await doInvite({ data: { email } });
      setInviteResult(result);
      setEmail("");
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create invitation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleShare() {
    if (!inviteResult) return;
    try {
      await navigator.share({
        title: "Join my team on CoinTrail",
        text: `You've been invited to join a team on CoinTrail.`,
        url: inviteResult.inviteUrl,
      });
    } catch {
      // user cancelled the share sheet, or share isn't actually available — nothing to do
    }
  }

  return (
    <>
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-foreground">
          <UserPlus className="h-4 w-4" />
          Invite someone to your team
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className={labelClass}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@email.com"
              className={fieldClass}
            />
          </div>
          <PrimaryButton type="submit" disabled={isSubmitting} className="justify-center">
            {isSubmitting ? "Creating..." : "Create Invite"}
          </PrimaryButton>
        </form>
        {error ? <p className="mt-2 text-[13px] text-destructive">{error}</p> : null}
      </Card>

      <Dialog open={Boolean(inviteResult)} onOpenChange={(open) => !open && setInviteResult(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Invitation Ready</DialogTitle>
            <DialogDescription>
              Invite created successfully. Send this link to {inviteResult?.email} — through WhatsApp, Gmail,
              Telegram, Messenger, SMS, Slack, or however you'd like.
            </DialogDescription>
          </DialogHeader>
          <div className="min-w-0 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <p className="text-[13px] break-all text-foreground">{inviteResult?.inviteUrl}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {inviteResult ? <CopyLinkButton url={inviteResult.inviteUrl} /> : null}
            {canShare() ? (
              <SecondaryButton type="button" onClick={handleShare} className="h-9 gap-2 px-4 text-[14px]">
                <Share2 className="h-4 w-4" />
                Share
              </SecondaryButton>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeamSettingsCard({
  teamName,
  standardHourlyRate,
  onSaved,
}: {
  teamName: string;
  standardHourlyRate: number | null;
  onSaved: () => void;
}) {
  const doUpdate = useServerFn(updateTeam);
  const [name, setName] = useState(teamName);
  const [rate, setRate] = useState(standardHourlyRate != null ? String(standardHourlyRate) : "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await doUpdate({
        data: {
          name: name.trim(),
          standardHourlyRate: rate.trim() === "" ? null : Number(rate),
        },
      });
      setSuccess("Team settings saved.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save team settings.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-[17px] font-semibold text-foreground">Team Settings</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
        <div>
          <label className={labelClass}>Team name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Standard hourly rate</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Optional"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className={fieldClass}
          />
        </div>
        <PrimaryButton type="submit" disabled={isSubmitting} className="w-full justify-center sm:w-auto">
          {isSubmitting ? "Saving..." : "Save"}
        </PrimaryButton>
      </form>
      {error ? <p className="mt-2 text-[13px] text-destructive">{error}</p> : null}
      {success ? <p className="mt-2 text-[13px] text-success">{success}</p> : null}
    </Card>
  );
}
