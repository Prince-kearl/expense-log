import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient, table, type FakeTables } from "./fakeDb";

const tables = vi.hoisted<FakeTables>(() => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => createFakeSupabaseClient(tables),
}));

process.env["SUPABASE_URL"] = "https://example.test";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key";

const {
  requireActiveRole,
  getTeamMembershipsForUser,
  resolveInitialTeamForUser,
  getLastActiveTeamId,
  setLastActiveTeamId,
} = await import("../supabase.server");

const USER = "user-1";
const TEAM_A = "team-a";
const TEAM_B = "team-b";

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  tables["team_members"] = [];
  tables["users"] = [{ id: USER, last_active_team_id: null }];
});

describe("requireActiveRole", () => {
  it("passes for an active member requesting member-level access", async () => {
    table(tables, "team_members").push({
      user_id: USER,
      team_id: TEAM_A,
      role: "member",
      status: "active",
    });
    await expect(requireActiveRole(USER, TEAM_A, "member")).resolves.toBe("member");
  });

  it("rejects an owner-only action from a plain member", async () => {
    table(tables, "team_members").push({
      user_id: USER,
      team_id: TEAM_A,
      role: "member",
      status: "active",
    });
    await expect(requireActiveRole(USER, TEAM_A, "owner")).rejects.toThrow(
      "Only a team owner can do this.",
    );
  });

  it("allows an owner-only action from an owner", async () => {
    table(tables, "team_members").push({
      user_id: USER,
      team_id: TEAM_A,
      role: "owner",
      status: "active",
    });
    await expect(requireActiveRole(USER, TEAM_A, "owner")).resolves.toBe("owner");
  });

  it("rejects a removed membership even though the row still exists", async () => {
    table(tables, "team_members").push({
      user_id: USER,
      team_id: TEAM_A,
      role: "owner",
      status: "removed",
    });
    await expect(requireActiveRole(USER, TEAM_A, "member")).rejects.toThrow(
      "You are no longer a member of this team.",
    );
  });

  it("rejects a user with no membership row for that team at all", async () => {
    await expect(requireActiveRole(USER, TEAM_A, "member")).rejects.toThrow(
      "You are no longer a member of this team.",
    );
  });

  it("evaluates role independently per team — owner in A does not imply owner in B", async () => {
    table(tables, "team_members").push(
      { user_id: USER, team_id: TEAM_A, role: "owner", status: "active" },
      { user_id: USER, team_id: TEAM_B, role: "member", status: "active" },
    );
    await expect(requireActiveRole(USER, TEAM_A, "owner")).resolves.toBe("owner");
    await expect(requireActiveRole(USER, TEAM_B, "owner")).rejects.toThrow(
      "Only a team owner can do this.",
    );
  });
});

describe("getTeamMembershipsForUser", () => {
  it("returns only active memberships, excluding removed ones", async () => {
    table(tables, "team_members").push(
      {
        user_id: USER,
        team_id: TEAM_A,
        role: "owner",
        status: "active",
        joined_at: "2026-01-01",
        teams: { id: TEAM_A, name: "Team A" },
      },
      {
        user_id: USER,
        team_id: TEAM_B,
        role: "member",
        status: "removed",
        joined_at: "2026-02-01",
        teams: { id: TEAM_B, name: "Team B" },
      },
    );
    const memberships = await getTeamMembershipsForUser(USER);
    expect(memberships).toEqual([{ team_id: TEAM_A, team_name: "Team A", role: "owner" }]);
  });

  it("never returns another user's memberships", async () => {
    table(tables, "team_members").push(
      {
        user_id: USER,
        team_id: TEAM_A,
        role: "owner",
        status: "active",
        joined_at: "2026-01-01",
        teams: { id: TEAM_A, name: "Team A" },
      },
      {
        user_id: "someone-else",
        team_id: TEAM_B,
        role: "owner",
        status: "active",
        joined_at: "2026-01-01",
        teams: { id: TEAM_B, name: "Team B" },
      },
    );
    const memberships = await getTeamMembershipsForUser(USER);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.team_id).toBe(TEAM_A);
  });
});

describe("resolveInitialTeamForUser", () => {
  it("returns null when the user has no active memberships", async () => {
    await expect(resolveInitialTeamForUser(USER)).resolves.toBeNull();
  });

  it("uses the remembered last-active team when still an active membership", async () => {
    table(tables, "team_members").push(
      {
        user_id: USER,
        team_id: TEAM_A,
        role: "owner",
        status: "active",
        joined_at: "2026-01-01",
        teams: { id: TEAM_A, name: "Team A" },
      },
      {
        user_id: USER,
        team_id: TEAM_B,
        role: "member",
        status: "active",
        joined_at: "2026-02-01",
        teams: { id: TEAM_B, name: "Team B" },
      },
    );
    await setLastActiveTeamId(USER, TEAM_A);
    const resolved = await resolveInitialTeamForUser(USER);
    expect(resolved?.team_id).toBe(TEAM_A);
  });

  it("falls back to the most recently joined team when the remembered team is no longer active", async () => {
    table(tables, "team_members").push(
      {
        user_id: USER,
        team_id: TEAM_A,
        role: "owner",
        status: "removed",
        joined_at: "2026-01-01",
        teams: { id: TEAM_A, name: "Team A" },
      },
      {
        user_id: USER,
        team_id: TEAM_B,
        role: "member",
        status: "active",
        joined_at: "2026-02-01",
        teams: { id: TEAM_B, name: "Team B" },
      },
    );
    await setLastActiveTeamId(USER, TEAM_A);
    const resolved = await resolveInitialTeamForUser(USER);
    expect(resolved?.team_id).toBe(TEAM_B);
  });

  it("round-trips getLastActiveTeamId/setLastActiveTeamId through the users table", async () => {
    await expect(getLastActiveTeamId(USER)).resolves.toBeNull();
    await setLastActiveTeamId(USER, TEAM_A);
    await expect(getLastActiveTeamId(USER)).resolves.toBe(TEAM_A);
  });
});
