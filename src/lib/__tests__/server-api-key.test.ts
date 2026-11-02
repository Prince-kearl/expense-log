import { afterEach, describe, expect, it, vi } from "vitest";

describe("server API key transport", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends opaque keys as apikey instead of a JWT bearer", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test-only");
    const request = vi.fn().mockResolvedValue(new Response("[]", {
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", request);
    const { db } = await import("../supabase.server");
    await db().from("teams").select("id");
    const headers = new Headers(request.mock.calls[0]?.[1]?.headers);
    expect(headers.get("apikey")).toBe("sb_secret_test-only");
    expect(headers.has("authorization")).toBe(false);
  });
});