import "@tanstack/react-start/server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type TeamRole = "owner" | "member";
export type MembershipStatus = "active" | "removed";
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired" | "revoked";

export type TeamUser = {
  id: string;
  name: string;
  email: string;
};

export type TeamMember = {
  membership_id: string;
  user_id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: MembershipStatus;
  joined_at: string;
};

export type Invitation = {
  id: string;
  team_id: string;
  email: string;
  invited_by_name: string;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
};

export type SessionTeamContext = {
  team_id: string;
  team_name: string;
  role: TeamRole;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Supabase is not configured: ${name} is missing.`);
  return value;
}

let client: SupabaseClient | null = null;

export function db() {
  if (!client) {
    client = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

export function fail(action: string, error: { message: string } | null): never {
  throw new Error(`${action} failed: ${error?.message ?? "unknown error"}`);
}

export async function findAuthUserByEmail(email: string) {
  const { data, error } = await db().auth.admin.listUsers({ perPage: 1000 });
  if (error) fail("Looking up account", error);
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function createAuthUser(email: string, password: string, name: string) {
  const { data, error } = await db().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) fail("Creating account", error);
  return data.user;
}

export async function verifyPassword(email: string, password: string) {
  const anon = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;
  return data.user;
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const { error } = await db().auth.admin.updateUserById(userId, { password: newPassword });
  if (error) fail("Updating password", error);
}

export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  // Errors from this call could reveal whether an email is registered, so we
  // deliberately swallow them — the caller always shows the same generic message.
  await db().auth.resetPasswordForEmail(email, { redirectTo });
}

export async function getUserFromAccessToken(accessToken: string) {
  const { data, error } = await db().auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

export async function getUserFromRecoveryCode(code: string) {
  const { data, error } = await db().auth.exchangeCodeForSession(code);
  if (error || !data.user) return null;
  return data.user;
}

export async function getUserProfile(userId: string): Promise<TeamUser | null> {
  const { data, error } = await db().from("users").select("id, name, email").eq("id", userId).maybeSingle();
  if (error) fail("Loading account", error);
  return data;
}

export async function createTeamWithOwner(userId: string, teamName: string) {
  const { data: team, error: teamError } = await db()
    .from("teams")
    .insert({ name: teamName, created_by: userId })
    .select("id, name")
    .single();
  if (teamError || !team) fail("Creating team", teamError);

  const { error: memberError } = await db()
    .from("team_members")
    .insert({ team_id: team.id, user_id: userId, role: "owner", status: "active" });
  if (memberError) fail("Adding you as team owner", memberError);

  return team as { id: string; name: string };
}

export type TeamDetails = { id: string; name: string; standard_hourly_rate: number | null; currency: string };

export async function getTeamById(teamId: string): Promise<TeamDetails | null> {
  const { data, error } = await db()
    .from("teams")
    .select("id, name, standard_hourly_rate, currency")
    .eq("id", teamId)
    .maybeSingle();
  if (error) fail("Loading team", error);
  return data as TeamDetails | null;
}

export async function getActiveTeamForUser(userId: string): Promise<SessionTeamContext | null> {
  const { data, error } = await db()
    .from("team_members")
    .select("role, teams(id, name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) fail("Loading your team", error);
  if (!data || !data.teams) return null;
  const team = data.teams as unknown as { id: string; name: string };
  return { team_id: team.id, team_name: team.name, role: data.role as TeamRole };
}

/** Re-checks membership live against the database — never trust the session cookie for owner-gated actions. */
export async function requireActiveRole(userId: string, teamId: string, role: TeamRole) {
  const { data, error } = await db()
    .from("team_members")
    .select("role, status")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .maybeSingle();
  if (error) fail("Checking permissions", error);
  if (!data || data.status !== "active") throw new Error("You are no longer a member of this team.");
  if (role === "owner" && data.role !== "owner") throw new Error("Only a team owner can do this.");
  return data.role as TeamRole;
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await db()
    .from("team_members")
    .select("id, user_id, role, status, joined_at, users(name, email)")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });
  if (error) fail("Loading team members", error);
  return (data ?? []).map((row) => {
    const user = row.users as unknown as { name: string; email: string };
    return {
      membership_id: row.id,
      user_id: row.user_id,
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: row.role as TeamRole,
      status: row.status as MembershipStatus,
      joined_at: row.joined_at,
    };
  });
}

export async function removeMember(teamId: string, userId: string) {
  const { error } = await db()
    .from("team_members")
    .update({ status: "removed" })
    .eq("team_id", teamId)
    .eq("user_id", userId);
  if (error) fail("Removing member", error);
}

export async function promoteToOwner(teamId: string, userId: string) {
  const { error } = await db()
    .from("team_members")
    .update({ role: "owner" })
    .eq("team_id", teamId)
    .eq("user_id", userId);
  if (error) fail("Promoting member", error);
}

export async function updateTeamSettings(teamId: string, updates: { name?: string; standard_hourly_rate?: number | null }) {
  const { error } = await db().from("teams").update(updates).eq("id", teamId);
  if (error) fail("Updating team settings", error);
}

export async function createInvitation(teamId: string, email: string, invitedByUserId: string) {
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const { data, error } = await db()
    .from("invitations")
    .insert({ team_id: teamId, email: email.toLowerCase(), invited_by: invitedByUserId, token, expires_at: expiresAt })
    .select("id, token")
    .single();
  if (error || !data) fail("Creating invitation", error);
  return data as { id: string; token: string };
}

export async function deleteInvitation(invitationId: string) {
  const { error } = await db().from("invitations").delete().eq("id", invitationId);
  if (error) fail("Removing invitation", error);
}

export async function listPendingInvitations(teamId: string): Promise<Invitation[]> {
  const { data, error } = await db()
    .from("invitations")
    .select("id, team_id, email, token, status, expires_at, created_at, users!invitations_invited_by_fkey(name)")
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) fail("Loading invitations", error);
  return (data ?? []).map((row) => ({
    id: row.id,
    team_id: row.team_id,
    email: row.email,
    invited_by_name: (row.users as unknown as { name: string } | null)?.name ?? "",
    token: row.token,
    status: row.status as InvitationStatus,
    expires_at: row.expires_at,
    created_at: row.created_at,
  }));
}

export async function getInvitationByToken(token: string) {
  const { data, error } = await db()
    .from("invitations")
    .select("id, team_id, email, status, expires_at, invited_by, teams(name), users!invitations_invited_by_fkey(name)")
    .eq("token", token)
    .maybeSingle();
  if (error) fail("Loading invitation", error);
  if (!data) return null;
  return {
    id: data.id,
    team_id: data.team_id,
    email: data.email,
    status: data.status as InvitationStatus,
    expires_at: data.expires_at,
    team_name: (data.teams as unknown as { name: string } | null)?.name ?? "",
    invited_by_name: (data.users as unknown as { name: string } | null)?.name ?? "",
  };
}

export async function markInvitationAccepted(invitationId: string) {
  const { error } = await db()
    .from("invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitationId);
  if (error) fail("Updating invitation", error);
}

export async function markInvitationDeclined(invitationId: string) {
  const { error } = await db().from("invitations").update({ status: "declined" }).eq("id", invitationId);
  if (error) fail("Updating invitation", error);
}

export async function joinTeam(teamId: string, userId: string) {
  const { error } = await db()
    .from("team_members")
    .insert({ team_id: teamId, user_id: userId, role: "member", status: "active" });
  if (error) fail("Joining team", error);
}

export type TimeEntryRow = {
  id: string;
  entry_date: string;
  hours: number;
  note: string;
  created_at: string;
};

export async function insertTimeEntry(teamId: string, userId: string, entry: { date: string; hours: number; note: string }) {
  const { data, error } = await db()
    .from("time_entries")
    .insert({ team_id: teamId, user_id: userId, entry_date: entry.date, hours: entry.hours, note: entry.note })
    .select("id, entry_date, hours, note, created_at")
    .single();
  if (error || !data) fail("Logging time", error);
  return data as TimeEntryRow;
}

export async function getTimeEntriesForUser(teamId: string, userId: string): Promise<TimeEntryRow[]> {
  const { data, error } = await db()
    .from("time_entries")
    .select("id, entry_date, hours, note, created_at")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) fail("Loading time entries", error);
  return data ?? [];
}

export async function deleteTimeEntryById(teamId: string, userId: string, entryId: string) {
  const { error } = await db()
    .from("time_entries")
    .delete()
    .eq("id", entryId)
    .eq("team_id", teamId)
    .eq("user_id", userId);
  if (error) fail("Deleting time entry", error);
}

export type TeamTimeEntryRow = TimeEntryRow & { user_id: string; user_name: string };

export async function getTimeEntriesForTeam(teamId: string, limit = 30): Promise<TeamTimeEntryRow[]> {
  const { data, error } = await db()
    .from("time_entries")
    .select("id, entry_date, hours, note, created_at, user_id, users(name)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("Loading team time entries", error);
  return (data ?? []).map((row) => ({
    id: row.id,
    entry_date: row.entry_date,
    hours: row.hours,
    note: row.note,
    created_at: row.created_at,
    user_id: row.user_id,
    user_name: (row.users as unknown as { name: string } | null)?.name ?? "",
  }));
}

export async function getLastNotificationsReadAt(userId: string): Promise<string> {
  const { data, error } = await db()
    .from("users")
    .select("last_notifications_read_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) fail("Loading notification state", error);
  return data?.last_notifications_read_at ?? new Date(0).toISOString();
}

export async function markNotificationsRead(userId: string) {
  const { error } = await db()
    .from("users")
    .update({ last_notifications_read_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) fail("Updating notification state", error);
}
