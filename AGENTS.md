Cloud schema changes live in Drizzle migrations; legacy supabase/migrations describe the pre-Cloud schema and must not be replayed on the managed database, because they omit grants and row-level security.
The existing signed-cookie session remains the app authentication boundary; every team operation verifies live membership server-side.
Server Supabase clients strip opaque API keys from Authorization and send them via apikey, preserving actual user bearer tokens, because opaque keys are not JWTs.
Over HTTPS (including behind the preview proxy via x-forwarded-proto) the session cookie is SameSite=None; Secure; Partitioned, because the editor preview embeds the app in a cross-site frame where Lax cookies are dropped.
Password fields use the shared PasswordInput control so visibility remains consistent across account forms.
Password recovery validates a recovery-method Auth credential and updates through the user's Auth endpoint before issuing the existing signed-cookie session; ordinary access tokens cannot authorize recovery.
Vercel serves the app only as a pass-through proxy: vercel.json rewrites forward all traffic to the published Lovable app, so no backend keys are configured on Vercel; remove the rewrite before ever switching to a self-managed backend (see DEPLOYMENT.md).
Absolute URLs the app generates for users (invite links, reset links) must prefer the browser-visible origin (origin / x-forwarded-host headers) over the server request URL, because Vercel and the preview proxy terminate the public domain.
- Server functions do not register the generated attachSupabaseAuth middleware: auth uses the signed-cookie session, and the attacher made every server call depend on browser backend settings being baked into the build.
