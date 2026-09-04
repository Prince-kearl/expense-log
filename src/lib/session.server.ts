import type { AppUser } from "./expenses";
import { requireActiveRole } from "./supabase.server";

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

export async function requireCurrentUser(request: Request): Promise<AppUser> {
  const user = await readSession(readCookie(request, "expense_tracker_session"));
  if (!user) throw new Error("You must sign in to continue.");
  // Re-check live membership on every request (not just owner-gated actions) so a
  // removed member loses access immediately instead of waiting out the session's
  // up-to-7-day expiry.
  await requireActiveRole(user.user_id, user.team_id, "member");
  return user;
}

export function readCookie(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
