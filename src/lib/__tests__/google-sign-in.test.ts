import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeAuthRedirect } from "../auth-redirect";
const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth }) }));
process.env["SUPABASE_URL"] = "https://auth.example.test";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-key";
const { getVerifiedSignInUser } = await import("../supabase.server");
beforeEach(() => vi.clearAllMocks());
describe("Google sign-in session verification", () => {
  it("rejects an invalid provider token", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    expect(await getVerifiedSignInUser("invalid-token")).toBeNull();
  });
  it("accepts only an identity verified by Auth with confirmed email", async () => {
    const user = { id: "verified-user", email_confirmed_at: "2026-11-09T00:00:00Z" };
    auth.getUser.mockResolvedValue({ data: { user }, error: null });
    expect(await getVerifiedSignInUser("verified-token")).toEqual(user);
    expect(auth.getUser).toHaveBeenCalledWith("verified-token");
  });
  it("rejects unconfirmed accounts", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "unconfirmed" } }, error: null });
    expect(await getVerifiedSignInUser("unconfirmed-token")).toBeNull();
  });
  it("keeps post-login navigation on this app", () => {
    expect(safeAuthRedirect("https://outside.example")).toBe("/dashboard");
    expect(safeAuthRedirect("//outside.example")).toBe("/dashboard");
    expect(safeAuthRedirect("/\\outside.example")).toBe("/dashboard");
    expect(safeAuthRedirect("/my-expenses")).toBe("/my-expenses");
  });
});