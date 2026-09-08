import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient, table, type FakeTables } from "./fakeDb";
import type { AppUser } from "../expenses";

const tables = vi.hoisted<FakeTables>(() => ({}));
const cookieStore = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => createFakeSupabaseClient(tables),
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => new Request("https://example.test"),
  setCookie: (_name: string, value: string) => {
    cookieStore.value = value;
  },
  deleteCookie: () => {
    cookieStore.value = undefined;
  },
}));

process.env["SUPABASE_URL"] = "https://example.test";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key";
process.env["SESSION_SECRET"] = "a".repeat(32);

const { createSession, requireCurrentUser } = await import("../session.server");

const USER = "user-1";
const TEAM_A = "team-a";
const TEAM_B = "team-b";

function makeRequestWithCookie(token: string) {
  return new Request("https://example.test", {
    headers: { cookie: `expense_tracker_session=${token}` },
  });
}

const baseUser: AppUser = {
  user_id: USER,
  name: "Ama",
  email: "ama@example.test",
  team_id: TEAM_A,
  team_name: "Team A",
  role: "owner",
};

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  tables["team_members"] = [];
  tables["users"] = [{ id: USER, last_active_team_id: null }];
  cookieStore.value = undefined;
});

describe("requireCurrentUser", () => {
  it("returns the session user unchanged when their active-team membership is still active", async () => {
    table(tables, "team_members").push({
      user_id: USER,
      team_id: TEAM_A,
      role: "owner",
      status: "active",
    });
    const token = await createSession(baseUser);
    const user = await requireCurrentUser(makeRequestWithCookie(token));
    expect(user.team_id).toBe(TEAM_A);
    expect(cookieStore.value).toBeUndefined(); // no session reissue needed on the happy path
  });

  it("falls back to another active team when the current one was revoked, and reissues the session", async () => {
    table(tables, "team_members").push(
      { user_id: USER, team_id: TEAM_A, role: "owner", status: "removed" },
      {
        user_id: USER,
        team_id: TEAM_B,
        role: "member",
        status: "active",
        joined_at: "2026-01-01",
        teams: { id: TEAM_B, name: "Team B" },
      },
    );
    const token = await createSession(baseUser); // session still claims Team A
    const user = await requireCurrentUser(makeRequestWithCookie(token));

    expect(user.team_id).toBe(TEAM_B);
    expect(user.role).toBe("member");
    expect(cookieStore.value).toBeDefined(); // session was reissued to point at Team B

    // Team A must not leak through as a side effect of the fallback.
    expect(user.team_id).not.toBe(TEAM_A);
  });

  it("throws (does not silently grant access) when no active memberships remain", async () => {
    table(tables, "team_members").push({
      user_id: USER,
      team_id: TEAM_A,
      role: "owner",
      status: "removed",
    });
    const token = await createSession(baseUser);
    await expect(requireCurrentUser(makeRequestWithCookie(token))).rejects.toThrow(
      "You are no longer a member of any team.",
    );
  });

  it("rejects a request with no session cookie at all", async () => {
    await expect(requireCurrentUser(new Request("https://example.test"))).rejects.toThrow(
      "You must sign in to continue.",
    );
  });
});
