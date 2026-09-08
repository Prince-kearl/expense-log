import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient, table, type FakeTables } from "./fakeDb";

const tables = vi.hoisted<FakeTables>(() => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => createFakeSupabaseClient(tables),
}));

process.env["SUPABASE_URL"] = "https://example.test";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key";

const { getBlockingOwnerships } = await import("../supabase.server");

const USER = "user-1";
const TEAMMATE = "user-2";
const TEAM_SOLO = "team-solo";
const TEAM_SHARED_NO_OTHER_OWNER = "team-shared-no-other-owner";
const TEAM_SHARED_WITH_OTHER_OWNER = "team-shared-with-other-owner";

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  tables["team_members"] = [];
});

describe("getBlockingOwnerships", () => {
  it("does not block deleting the sole member of a team they own alone", async () => {
    table(tables, "team_members").push({
      user_id: USER,
      team_id: TEAM_SOLO,
      role: "owner",
      status: "active",
      teams: { name: "Solo Co" },
    });
    await expect(getBlockingOwnerships(USER)).resolves.toEqual([]);
  });

  it("blocks deleting an owner when other active members would be left without one", async () => {
    table(tables, "team_members").push(
      {
        user_id: USER,
        team_id: TEAM_SHARED_NO_OTHER_OWNER,
        role: "owner",
        status: "active",
        teams: { name: "Shared Co" },
      },
      { user_id: TEAMMATE, team_id: TEAM_SHARED_NO_OTHER_OWNER, role: "member", status: "active" },
    );
    await expect(getBlockingOwnerships(USER)).resolves.toEqual(["Shared Co"]);
  });

  it("does not block when another active owner already covers the team", async () => {
    table(tables, "team_members").push(
      {
        user_id: USER,
        team_id: TEAM_SHARED_WITH_OTHER_OWNER,
        role: "owner",
        status: "active",
        teams: { name: "Covered Co" },
      },
      { user_id: TEAMMATE, team_id: TEAM_SHARED_WITH_OTHER_OWNER, role: "owner", status: "active" },
    );
    await expect(getBlockingOwnerships(USER)).resolves.toEqual([]);
  });

  it("ignores a removed teammate when deciding whether the team is left ownerless", async () => {
    table(tables, "team_members").push(
      {
        user_id: USER,
        team_id: TEAM_SHARED_NO_OTHER_OWNER,
        role: "owner",
        status: "active",
        teams: { name: "Shared Co" },
      },
      { user_id: TEAMMATE, team_id: TEAM_SHARED_NO_OTHER_OWNER, role: "member", status: "removed" },
    );
    await expect(getBlockingOwnerships(USER)).resolves.toEqual([]);
  });

  it("does not block on teams where the user is only a member, not an owner", async () => {
    table(tables, "team_members").push({
      user_id: USER,
      team_id: TEAM_SHARED_NO_OTHER_OWNER,
      role: "member",
      status: "active",
      teams: { name: "Shared Co" },
    });
    await expect(getBlockingOwnerships(USER)).resolves.toEqual([]);
  });
});
