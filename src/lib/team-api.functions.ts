import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import type { AppUser } from "./expenses";
import { createSession, readCookie, readSession, requireCurrentUser } from "./session.server";
import {
  createAuthUser,
  createInvitation,
  createTeamWithOwner,
  deleteTimeEntryById,
  findAuthUserByEmail,
  getActiveTeamForUser,
  getInvitationByToken,
  getTeamById,
  getTeamMembers,
  getTimeEntriesForUser,
  getUserFromAccessToken,
  getUserFromRecoveryCode,
  getUserProfile,
  insertTimeEntry,
  joinTeam,
  listPendingInvitations,
  markInvitationAccepted,
  markInvitationDeclined,
  promoteToOwner,
  removeMember,
  requireActiveRole,
  sendPasswordResetEmail,
  updateTeamSettings,
  updateUserPassword,
  verifyPassword,
} from "./supabase.server";
import { getExpensesForTeam } from "./supabase-expenses.server";

const SESSION_COOKIE = "expense_tracker_session";

function isSecureRequest() {
  return getRequest().url.startsWith("https:");
}

async function establishSession(user: AppUser) {
  const token = await createSession(user);
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(),
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export const signUp = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(1, "Enter your name.").max(120),
      email: z.string().trim().toLowerCase().email("Enter a valid email."),
      password: z.string().min(8, "Password must be at least 8 characters."),
      teamName: z.string().trim().min(1, "Enter a team name.").max(120),
    }),
  )
  .handler(async ({ data }) => {
    const existing = await findAuthUserByEmail(data.email);
    if (existing) throw new Error("An account with this email already exists. Try signing in instead.");

    const authUser = await createAuthUser(data.email, data.password, data.name);
    const team = await createTeamWithOwner(authUser.id, data.teamName);

    const user: AppUser = {
      user_id: authUser.id,
      name: data.name,
      email: data.email,
      team_id: team.id,
      team_name: team.name,
      role: "owner",
    };
    await establishSession(user);
    return user;
  });

export const signIn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().trim().toLowerCase().email("Enter a valid email."),
      password: z.string().min(1, "Enter your password."),
    }),
  )
  .handler(async ({ data }) => {
    const authUser = await verifyPassword(data.email, data.password);
    if (!authUser) throw new Error("Incorrect email or password.");

    const profile = await getUserProfile(authUser.id);
    const team = await getActiveTeamForUser(authUser.id);
    if (!profile || !team) throw new Error("You're not currently part of a team.");

    const user: AppUser = {
      user_id: authUser.id,
      name: profile.name,
      email: profile.email,
      team_id: team.team_id,
      team_name: team.team_name,
      role: team.role,
    };
    await establishSession(user);
    return user;
  });

export const signOutUser = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE, { path: "/" });
});

export const getCurrentTeam = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireCurrentUser(getRequest());
  const [team, members, invitations] = await Promise.all([
    getTeamById(user.team_id),
    getTeamMembers(user.team_id),
    listPendingInvitations(user.team_id),
  ]);
  if (!team) throw new Error("Team not found.");
  return { team, currentUserId: user.user_id, members, invitations };
});

export const inviteMember = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email.") }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    const invitation = await createInvitation(user.team_id, data.email, user.user_id);
    const origin = new URL(getRequest().url).origin;
    return { email: data.email, inviteUrl: `${origin}/invite/${invitation.token}` };
  });

export const getInvitationDetails = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const invitation = await getInvitationByToken(data.token);
    if (!invitation) return { status: "not_found" as const };
    if (invitation.status !== "pending") return { status: invitation.status };
    if (new Date(invitation.expires_at) < new Date()) return { status: "expired" as const };

    const authUser = await findAuthUserByEmail(invitation.email);
    const currentUser = await readSession(readCookie(getRequest(), SESSION_COOKIE));

    return {
      status: "pending" as const,
      email: invitation.email,
      teamName: invitation.team_name,
      invitedByName: invitation.invited_by_name,
      hasAccount: Boolean(authUser),
      viewerMatches: Boolean(currentUser && currentUser.email.toLowerCase() === invitation.email.toLowerCase()),
    };
  });

export const createAccountFromInvitation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(1),
      name: z.string().trim().min(1, "Enter your name.").max(120),
      password: z.string().min(8, "Password must be at least 8 characters."),
    }),
  )
  .handler(async ({ data }) => {
    const invitation = await getInvitationByToken(data.token);
    if (!invitation || invitation.status !== "pending") throw new Error("This invitation is no longer valid.");
    if (new Date(invitation.expires_at) < new Date()) throw new Error("This invitation has expired.");

    const existing = await findAuthUserByEmail(invitation.email);
    if (existing) throw new Error("An account with this email already exists. Sign in instead to accept.");

    const authUser = await createAuthUser(invitation.email, data.password, data.name);
    await joinTeam(invitation.team_id, authUser.id);
    await markInvitationAccepted(invitation.id);

    const user: AppUser = {
      user_id: authUser.id,
      name: data.name,
      email: invitation.email,
      team_id: invitation.team_id,
      team_name: invitation.team_name,
      role: "member",
    };
    await establishSession(user);
    return user;
  });

export const respondToInvitation = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), accept: z.boolean() }))
  .handler(async ({ data }) => {
    const currentUser = await requireCurrentUser(getRequest());
    const invitation = await getInvitationByToken(data.token);
    if (!invitation || invitation.status !== "pending") throw new Error("This invitation is no longer valid.");
    if (invitation.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      throw new Error("This invitation was sent to a different email address.");
    }
    if (!data.accept) {
      await markInvitationDeclined(invitation.id);
      return { joined: false };
    }
    if (currentUser.team_id) throw new Error("You're already part of a team.");
    await joinTeam(invitation.team_id, currentUser.user_id);
    await markInvitationAccepted(invitation.id);
    return { joined: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    await requireActiveRole(user.user_id, user.team_id, "owner");
    if (data.userId === user.user_id) throw new Error("You can't remove yourself from the team.");
    await removeMember(user.team_id, data.userId);
  });

export const promoteTeamMember = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    await requireActiveRole(user.user_id, user.team_id, "owner");
    await promoteToOwner(user.team_id, data.userId);
  });

export const updateTeam = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(1).max(120).optional(),
      standardHourlyRate: z.number().min(0).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    await requireActiveRole(user.user_id, user.team_id, "owner");
    await updateTeamSettings(user.team_id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.standardHourlyRate !== undefined ? { standard_hourly_rate: data.standardHourlyRate } : {}),
    });
  });

export const logTime = createServerFn({ method: "POST" })
  .validator(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
      hours: z.number().positive("Enter a number of hours greater than zero."),
      note: z.string().trim().min(1, "Describe what you worked on.").max(500),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    return insertTimeEntry(user.team_id, user.user_id, data);
  });

export const getMyTimeEntries = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireCurrentUser(getRequest());
  return getTimeEntriesForUser(user.team_id, user.user_id);
});

export const deleteTimeEntry = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    await deleteTimeEntryById(user.team_id, user.user_id, data.id);
  });

export const getMemberOverview = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    const members = await getTeamMembers(user.team_id);
    const member = members.find((m) => m.user_id === data.userId);
    if (!member) throw new Error("That person isn't part of your team.");

    const [expenses, timeEntries] = await Promise.all([
      getExpensesForTeam(user.team_id),
      getTimeEntriesForUser(user.team_id, data.userId),
    ]);

    return {
      member,
      expenses: expenses.filter((e) => e.created_by_user_id === data.userId),
      timeEntries,
    };
  });

export const changePassword = createServerFn({ method: "POST" })
  .validator(
    z.object({
      currentPassword: z.string().min(1, "Enter your current password."),
      newPassword: z.string().min(8, "New password must be at least 8 characters."),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    const verified = await verifyPassword(user.email, data.currentPassword);
    if (!verified) throw new Error("Current password is incorrect.");
    await updateUserPassword(user.user_id, data.newPassword);
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email.") }))
  .handler(async ({ data }) => {
    const origin = new URL(getRequest().url).origin;
    await sendPasswordResetEmail(data.email, `${origin}/reset-password`);
    // Always resolves the same way regardless of whether the email is registered.
  });

export const confirmPasswordReset = createServerFn({ method: "POST" })
  .validator(
    z.object({
      newPassword: z.string().min(8, "Password must be at least 8 characters."),
      accessToken: z.string().min(1).optional(),
      code: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const authUser = data.accessToken
      ? await getUserFromAccessToken(data.accessToken)
      : data.code
        ? await getUserFromRecoveryCode(data.code)
        : null;
    if (!authUser) throw new Error("This reset link is invalid or has expired. Request a new one.");

    await updateUserPassword(authUser.id, data.newPassword);

    const profile = await getUserProfile(authUser.id);
    const team = await getActiveTeamForUser(authUser.id);
    if (!profile || !team) {
      return { signedIn: false };
    }

    const user: AppUser = {
      user_id: authUser.id,
      name: profile.name,
      email: profile.email,
      team_id: team.team_id,
      team_name: team.team_name,
      role: team.role,
    };
    await establishSession(user);
    return { signedIn: true };
  });
