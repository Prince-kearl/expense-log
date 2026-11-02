import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ resetPasswordForEmail: vi.fn(), getClaims: vi.fn(), getUser: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth }) }));
process.env["SUPABASE_URL"] = "https://auth.example.test";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-key";
process.env["SUPABASE_PUBLISHABLE_KEY"] = "test-public-key";
const { sendPasswordResetEmail, getUserFromAccessToken, updateRecoveryPassword } = await import("../supabase.server");

beforeEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("password recovery", () => {
  it("sends the email to the supplied public reset page", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await sendPasswordResetEmail("person@example.test", "https://cointrail.example/reset-password");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("person@example.test", { redirectTo: "https://cointrail.example/reset-password" });
  });
  it("does not claim success when the email service fails", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 500, message: "private provider detail" } });
    await expect(sendPasswordResetEmail("person@example.test", "https://cointrail.example/reset-password")).rejects.toThrow("Unable to send the reset email right now.");
  });
  it("rejects ordinary password sign-in tokens", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { amr: [{ method: "password" }] } }, error: null });
    expect(await getUserFromAccessToken("ordinary-token")).toBeNull();
    expect(auth.getUser).not.toHaveBeenCalled();
  });
  it("requires a verified recovery credential", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { amr: [{ method: "recovery" }] } }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: { id: "recovery-user" } }, error: null });
    expect(await getUserFromAccessToken("recovery-token")).toEqual({ id: "recovery-user" });
  });
  it("rejects expired credentials", async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: { message: "expired" } });
    expect(await getUserFromAccessToken("expired-token")).toBeNull();
  });
  it("updates with the recovery bearer and no current password", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await updateRecoveryPassword("recovery-token", "new-password-example");
    expect(fetchMock).toHaveBeenCalledWith("https://auth.example.test/auth/v1/user", expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer recovery-token", apikey: "test-public-key" }),
      body: JSON.stringify({ password: "new-password-example" }),
    }));
  });
});