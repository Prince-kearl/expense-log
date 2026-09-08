import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient, table, type FakeTables } from "./fakeDb";

const tables = vi.hoisted<FakeTables>(() => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => createFakeSupabaseClient(tables),
}));

process.env["SUPABASE_URL"] = "https://example.test";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key";

const { deleteInvitation, listPendingInvitations } = await import("../supabase.server");

const TEAM_A = "team-a";
const TEAM_B = "team-b";

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  tables["invitations"] = [];
});

describe("cross-team invitation revocation", () => {
  it("does not revoke a Team A invitation when scoped to Team B", async () => {
    const invitationId = crypto.randomUUID();
    table(tables, "invitations").push({
      id: invitationId,
      team_id: TEAM_A,
      email: "new-hire@example.test",
      token: "tok",
      status: "pending",
      expires_at: "2099-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      users: { name: "Ama" },
    });

    await deleteInvitation(TEAM_B, invitationId);

    const stillPending = await listPendingInvitations(TEAM_A);
    expect(stillPending).toHaveLength(1);
  });

  it("revokes the invitation when scoped to the team that actually owns it", async () => {
    const invitationId = crypto.randomUUID();
    table(tables, "invitations").push({
      id: invitationId,
      team_id: TEAM_A,
      email: "new-hire@example.test",
      token: "tok",
      status: "pending",
      expires_at: "2099-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      users: { name: "Ama" },
    });

    await deleteInvitation(TEAM_A, invitationId);

    await expect(listPendingInvitations(TEAM_A)).resolves.toEqual([]);
  });
});
