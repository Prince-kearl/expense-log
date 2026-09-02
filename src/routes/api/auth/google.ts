import { createFileRoute } from "@tanstack/react-router";
import { getGoogleConfig, upsertGoogleUser } from "@/lib/google.server";
import { createSession, readCookie, sessionCookie } from "@/lib/session.server";

export const Route = createFileRoute("/api/auth/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const config = getGoogleConfig();
        const url = new URL(request.url);
        const secure = url.protocol === "https:";
        const code = url.searchParams.get("code");
        if (!code) {
          const state = crypto.randomUUID();
          const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
          authorize.search = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: `${config.appUrl}/api/auth/google`,
            response_type: "code",
            scope: "openid email profile",
            state,
            prompt: "select_account",
          }).toString();
          return new Response(null, {
            status: 302,
            headers: {
              location: authorize.toString(),
              "set-cookie": `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure ? "; Secure" : ""}`,
            },
          });
        }

        const state = url.searchParams.get("state");
        if (!state || state !== readCookie(request, "oauth_state")) return Response.redirect(`${config.appUrl}/login?error=oauth_state`, 302);
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: `${config.appUrl}/api/auth/google`, grant_type: "authorization_code" }),
        });
        const token = (await tokenResponse.json()) as { access_token?: string };
        if (!tokenResponse.ok || !token.access_token) return Response.redirect(`${config.appUrl}/login?error=oauth_token`, 302);
        const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${token.access_token}` } });
        const profile = (await profileResponse.json()) as { sub?: string; name?: string; email?: string; picture?: string };
        if (!profileResponse.ok || !profile.sub || !profile.name || !profile.email) return Response.redirect(`${config.appUrl}/login?error=oauth_profile`, 302);
        const user = await upsertGoogleUser({
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          ...(profile.picture ? { picture: profile.picture } : {}),
        });
        return new Response(null, {
          status: 302,
          headers: await (async () => {
            const headers = new Headers({ location: `${config.appUrl}/dashboard` });
            headers.append("set-cookie", sessionCookie(await createSession(user), secure));
            headers.append("set-cookie", `oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`);
            return headers;
          })(),
        });
      },
    },
  },
});