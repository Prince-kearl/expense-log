import { deleteCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import type { AppUser } from "./expenses";
import {
  getTeamMembershipsForUser,
  requireActiveRole,
  setLastActiveTeamId,
} from "./supabase.server";

export const SESSION_COOKIE = "expense_tracker_session";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function getSessionSecret() {
  const secret = process.env["SESSION_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a value of at least 32 characters.");
  }
  return secret;
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64UrlEncode(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

export async function createSession(user: AppUser) {
  const payload = base64UrlEncode(
    JSON.stringify({ user, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 }),
  );
  return `${payload}.${await sign(payload)}`;
}

export async function readSession(token: string | undefined): Promise<AppUser | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== (await sign(payload))) return null;

  try {
    const parsed = JSON.parse(decoder.decode(base64UrlDecode(payload))) as {
      user?: AppUser;
      expiresAt?: number;
    };
    return parsed.user && typeof parsed.expiresAt === "number" && parsed.expiresAt > Date.now()
      ? parsed.user
      : null;
  } catch {
    return null;
  }
}

function isSecureRequest() {
  return getRequest().url.startsWith("https:");
}

// Over HTTPS the app may run embedded in another site's frame (e.g. the editor
// preview), where SameSite=Lax cookies are dropped as third-party. SameSite=None
// + Partitioned keeps the session working there and in normal top-level tabs.
function cookieAttributes() {
  const secure = isSecureRequest();
  return secure
    ? { httpOnly: true, sameSite: "none" as const, secure: true, partitioned: true, path: "/" }
    : { httpOnly: true, sameSite: "lax" as const, secure: false, path: "/" };
}

export async function establishSession(user: AppUser) {
  const token = await createSession(user);
  setCookie(SESSION_COOKIE, token, { ...cookieAttributes(), maxAge: 60 * 60 * 24 * 7 });
}

export function clearSession() {
  deleteCookie(SESSION_COOKIE, cookieAttributes());
}

export async function requireCurrentUser(request: Request): Promise<AppUser> {
  const user = await readSession(readCookie(request, SESSION_COOKIE));
  if (!user) throw new Error("You must sign in to continue.");

  // Re-check live membership on every request (not just owner-gated actions) so a
  // removed member loses access immediately instead of waiting out the session's
  // up-to-7-day expiry.
  try {
    await requireActiveRole(user.user_id, user.team_id, "member");
    return user;
  } catch {
    // The session's active team no longer has this user as an active member
    // (they were removed, or the team was switched away from elsewhere). Fall
    // back to another team they still belong to rather than forcing a full
    // logout — only sign-out-worthy if they have no active memberships left.
    const memberships = await getTeamMembershipsForUser(user.user_id);
    const fallback = memberships[0];
    if (!fallback) throw new Error("You are no longer a member of any team.");

    const switched: AppUser = { ...user, ...fallback };
    await establishSession(switched);
    await setLastActiveTeamId(user.user_id, fallback.team_id);
    return switched;
  }
}

export function readCookie(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
