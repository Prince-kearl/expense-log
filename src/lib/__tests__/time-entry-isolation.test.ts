import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient, table, type FakeTables } from "./fakeDb";

const tables = vi.hoisted<FakeTables>(() => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => createFakeSupabaseClient(tables),
}));

process.env["SUPABASE_URL"] = "https://example.test";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key";

const { insertTimeEntry, getTimeEntriesForUser, deleteTimeEntryById, getTimeEntriesForTeam } =
  await import("../supabase.server");

const TEAM_A = "team-a";
const TEAM_B = "team-b";
const USER_A = "user-a";

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  tables["time_entries"] = [];
});

describe("cross-team time-entry isolation", () => {
  it("never lists a Team A time entry when queried as Team B, even for the same user id", async () => {
    await insertTimeEntry(TEAM_A, USER_A, { date: "2026-01-01", hours: 4, note: "Design review" });
    await expect(getTimeEntriesForUser(TEAM_B, USER_A)).resolves.toEqual([]);
    await expect(getTimeEntriesForUser(TEAM_A, USER_A)).resolves.toHaveLength(1);
  });

  it("keeps the team activity feed scoped to its own team", async () => {
    table(tables, "time_entries").push({
      id: crypto.randomUUID(),
      team_id: TEAM_A,
      user_id: USER_A,
      entry_date: "2026-01-01",
      hours: 4,
      note: "Design review",
      created_at: "2026-01-01T00:00:00.000Z",
      users: { name: "Ama" },
    });
    await expect(getTimeEntriesForTeam(TEAM_B)).resolves.toEqual([]);
  });

  it("does not delete a Team A entry when the delete is scoped to Team B", async () => {
    const created = await insertTimeEntry(TEAM_A, USER_A, {
      date: "2026-01-01",
      hours: 4,
      note: "Design review",
    });
    await deleteTimeEntryById(TEAM_B, USER_A, created.id);
    await expect(getTimeEntriesForUser(TEAM_A, USER_A)).resolves.toHaveLength(1);
  });
});
