# Publishing CoinTrail to Google Play (Trusted Web Activity)

The Android app opens https://teamtrails.vercel.app full screen. App updates go live on the website — no resubmission needed.

## 1. Redeploy Vercel
Make sure the latest version is published, then check these open in a browser:
- https://teamtrails.vercel.app/manifest.webmanifest
- https://teamtrails.vercel.app/.well-known/assetlinks.json
- https://teamtrails.vercel.app/privacy
- https://teamtrails.vercel.app/delete-account

## 2. Generate the Android package
1. Go to https://www.pwabuilder.com and enter `https://teamtrails.vercel.app`.
2. Choose **Package for stores → Android → Google Play**.
3. Package ID: `app.vercel.teamtrails.twa` (must match `public/.well-known/assetlinks.json`).
4. Download the zip. Keep the **signing key file and its passwords** safe — you need them for every update.

## 3. Google Play Console ($25 one-time)
1. Create the app, upload the `.aab` file to **Internal testing** first.
2. Go to **Setup → App integrity → App signing**, copy the **SHA-256 certificate fingerprint**.
3. Paste it into `public/.well-known/assetlinks.json` (replacing the placeholder), republish, redeploy Vercel. Without this, the app shows a browser address bar.

## 4. Store listing requirements
- Privacy policy URL: `https://teamtrails.vercel.app/privacy`
- Data safety → Account deletion URL: `https://teamtrails.vercel.app/delete-account`
- Data safety answers: collects name, email, financial info (expenses), files (receipts); encrypted in transit; users can request deletion; not shared; no ads.
- App access: give reviewers a working test login (email + password) — required since the app needs sign-in.
- Content rating questionnaire, target audience 18+, category Finance/Business.
- Graphics: 512×512 icon, 1024×500 feature graphic, at least 2 phone screenshots.
- New personal developer accounts: 12+ testers in closed testing for 14 days before production.
