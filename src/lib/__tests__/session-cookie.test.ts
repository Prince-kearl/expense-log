import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "../expenses";

const state = vi.hoisted(() => ({
  request: new Request("http://localhost:8080"),
  options: undefined as Record<string, unknown> | undefined,
}));

vi.mock("./../supabase.server", () => ({}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => state.request,
  setCookie: (_name: string, _value: string, options: Record<string, unknown>) => {
    state.options = options;
  },
  deleteCookie: () => {},
}));

process.env["SESSION_SECRET"] = "a".repeat(32);
const { establishSession } = await import("../session.server");

const user: AppUser = {
  user_id: "u1",
  name: "Ama",
  email: "ama@example.test",
  team_id: "t1",
  team_name: "Team",
  role: "owner",
};

beforeEach(() => {
  state.options = undefined;
});

describe("session cookie", () => {
  it("survives being embedded in another site's frame over HTTPS (behind a proxy)", async () => {
    state.request = new Request("http://localhost:8080/_serverFn/x", {
      headers: { "x-forwarded-proto": "https" },
    });
    await establishSession(user);
    expect(state.options).toMatchObject({ sameSite: "none", secure: true, partitioned: true });
  });

  it("uses a plain Lax cookie on local http", async () => {
    state.request = new Request("http://localhost:8080/_serverFn/x");
    await establishSession(user);
    expect(state.options).toMatchObject({ sameSite: "lax", secure: false });
  });
});
