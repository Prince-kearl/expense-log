# CoinTrail on Vercel

## Why sign-in is failing

The current sign-in code uses `SUPABASE_SERVICE_ROLE_KEY` on the server for account and team operations. Vercel does not inherit Lovable Cloud's private settings. A missing key is a deployment configuration problem, not an incorrect password.

The managed Cloud service key is not available for copying to Vercel. Refreshing the Cloud connection only repairs Lovable's environment. Do not substitute the public key for the service key, remove authorization checks, or put private keys in browser variables.

## Move safely to a backend you control

1. Create a separate, user-owned Supabase project for the Vercel app. This does not disconnect or change the existing Lovable Cloud backend.
2. In Lovable, open **More → Database → Manage → Settings → Export project data**. In the Database card, choose **Export → Start export**, then download the export from the emailed link. It contains schema, data, and accounts with password hashes.
3. Restore that export into the new project using the destination provider's supported import process. Do not replay old migrations over an imported database. Keep the original Cloud database intact until verification finishes.
4. Download receipts separately through **More → Storage**. Database exports do not include storage files. Transfer them into a private `receipts` bucket, preserving object paths and access restrictions.
5. Configure email delivery and sign-in/recovery URL settings on the destination. Allow the exact Vercel site's `/reset-password` URL. Provider settings and API keys are not included in the export.

## Configure Vercel

In the Vercel project, open **Settings → Environment Variables** and configure the destination settings for **Production** (and **Preview** if you use preview deployments):

| Name | Purpose | Visibility |
| --- | --- | --- |
| `SUPABASE_URL` | Destination backend URL | Server |
| `SUPABASE_PUBLISHABLE_KEY` | Destination public key for server-side public-client configuration | Server configuration, non-secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Destination server/service API key | Private, server only |
| `SESSION_SECRET` | Session signing secret, at least 32 characters, supplied by a secure secret manager | Private, server only |
| `VITE_SUPABASE_URL` | Same destination backend for browser recovery operations | Public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Destination public/publishable API key | Public |

Never use a `VITE_` prefix for the service key or session secret. Never commit real values to `.env.example`, source code, or Git. Public and server URLs must point to the same destination. A new session secret requires everyone to sign in again.

Redeploy Vercel after saving settings: browser settings are included at build time, and previous deployments do not receive newly added environment variables automatically.

The shared Vite configuration supports a Nitro Vercel preset, but the current app defaults to Cloudflare outside Lovable. Confirm the actual Vercel build target before deployment; the reported missing-key error does not establish that the rest of the deployment is configured correctly.

## Before switching users over

- Confirm an existing account can sign in and remains signed in after refresh.
- Confirm existing teams, expenses, and receipt downloads are present.
- Save an expense and verify it remains after reload.
- Confirm team members cannot access another team's data.
- Complete a password reset from a real email link and sign in with the new password.

The migration and Vercel sign-in are not complete until these checks pass against the destination. No destination credentials or Vercel access have been provided yet.