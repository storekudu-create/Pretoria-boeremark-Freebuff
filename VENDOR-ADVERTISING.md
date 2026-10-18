# Vendor advertising

The public map reads shared listings from the Supabase project **Pretoria Boeremark** (`sflktwotveoltsdlkhrm`, Briers organization). Photos are uploaded to the public `market-media` bucket after ownership checks. Client configuration contains only the publishable key; privileged storage credentials stay inside the Edge Function.

## Market administrator

**Current temporary mode:** Administration opens directly without email or password. Anyone visiting the site can manage listings, sponsors, photos and vendor links. The market owner explicitly enabled this mode. To restore private administration, run `update public.bm_settings set public_administration=false where id=1;` in the Supabase SQL editor. This immediately protects write operations again; refreshing the app also restores the sign-in screen. The instructions below apply when sign-in is restored.

1. Open Administration and enter `myeposb@gmail.com`.
2. Request the sign-in email. Copy the email's sign-in link address and paste it in the form, or paste its verification code if supplied. Do not open the email link: the form verifies it directly without depending on a dashboard redirect setting.
3. Select the stall and choose **Create / replace private link**. Give that link only to its vendor. The expandable code is an alternative way to sign in.
4. **Revoke access** disables the link immediately for subsequent requests. Replacing a link invalidates the previous one.

The admin session lasts until sign-out, page reload, or the authentication token expires. No password or private vendor code is stored in browser localStorage. The email allowlist lives in the private database schema; changing a public email field cannot grant admin rights.

Old browser-only listing edits remain in localStorage. In Administration, **Load old browser details** loads the selected stall's previous values into the form for review. **Save listing** publishes them to the shared database. This does not import other stalls automatically.

## Vendor

Open the private link or choose **Vendor sign-in** and paste the code/link. Edit the name, logo, description, WhatsApp, website, products, up to six product photos, availability, Saturday offer/photo, and promotional offer. **Save and publish** makes the changes visible to all visitors. An already-open map refreshes every minute or when refocused.

Stall key, number, SVG/map location, category, and paid advertising flags cannot be changed through vendor requests. The database rejects those fields, including forged API requests. Vendor links contain 256-bit random tokens, with only their SHA-256 hashes stored in the private access table. The URL fragment is cleared when the editor opens; bookmark the original supplied link if needed.

Saturday offers appear during the existing weekly window, ending Saturday 09:30 South African time. Uncheck **Publish my Saturday special** to withdraw the vendor's offer. Photo removal removes its use in the listing; unused uploaded objects are retained in storage and may be cleaned up separately.

## Deployment and checks

- Apply the SQL migrations in order to a new Supabase project, adapting the fixed project image URL and administrator email if deploying elsewhere. The migrations in this repository match the applied remote versions.
- Deploy `supabase/functions/market-media/index.ts` as `market-media` with gateway JWT verification disabled. The function itself authenticates every upload against a live vendor code or the administrator JWT. It requires Supabase's standard runtime environment variables and uses no hardcoded private key.
- Build the Vite app and deploy its output to Vercel. No Vercel server secret is needed.
- Run TypeScript checking and the browser regression scripts with Playwright/Edge installed.
- `scripts/check-vendor-self-service.cjs` requires an isolated temporary fixture described in `scripts/create-vendor-test-fixture.mjs`. It writes only the QA listing and a small synthetic image. Never supply a real vendor's code for this test.
- Database access checks verified anonymous/direct-write denial, invalid and revoked code denial, fixed-location and paid-tier protection, optimistic revision conflicts, administrator issuance/revocation, and non-administrator denial inside rolled-back transactions.

The built-in Supabase email provider has delivery restrictions and rate limits. This installation uses the approved organization account email for administrator sign-in; vendors use private links and do not depend on email delivery. The administrator email delivery step must be checked by the mailbox owner.

## Outside sponsors and footer

Administration includes **Outside sponsors · Map advertising**. Add up to six businesses, choose their business type, upload an advertisement or logo, enter their website and an optional message, and enable **Show on the map**. Save sponsors to publish. Sponsorship is independent of stall ownership. Only the approved market administrator can change it; vendor links cannot edit sponsors. Removing or disabling a sponsor removes its public banner after saving. A placeholder is shown until a sponsor is configured; no fictional sponsor is published.

The map has a dedicated vertical sponsor column inside its left frame, leaving stall targets unobscured. Links open the sponsor website in a new tab. The bottom floating pill footer opens **Map legend** and **Market information** in keyboard-accessible dialogs; it is hidden during phone fullscreen and stall-detail dialogs.

`check-sponsors-footer.cjs` verifies both phone and desktop layouts, sponsor administration, safe links, footer dialogs and fullscreen behavior. It mocks email authentication and all writes, so it never sends sign-in emails or publishes test sponsors.
