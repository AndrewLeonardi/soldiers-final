# Supabase + Stripe setup — flipping Sprint 3 on

Production Sprint 3 ships the *code* for anonymous auth, write-through sync, and Stripe checkout. This doc is the *runbook* for connecting it to real infrastructure.

**Until the env vars below are set, the app runs in offline mode** — tokens are granted locally on pack click, no accounts, no payments. That's the Sprint 1 behavior preserved as a safe fallback. Setting the vars flips on the full stack.

---

## Required env vars

Create `.env.local` at the repo root:

```
# ── Supabase (flips on auth + sync) ─────────────────────────
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# ── Analytics (optional) ────────────────────────────────────
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://us.posthog.com
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

`.env.local` is gitignored. Never commit it.

---

## Step 1 — Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. Region: pick the one closest to your primary audience.
3. Once provisioned, Project Settings → API:
   - Copy **Project URL** → `VITE_SUPABASE_URL`
   - Copy **anon / public key** → `VITE_SUPABASE_ANON_KEY`
   - Copy **service_role key** — needed later for Edge Functions. **Never expose this to the browser.**

## Step 2 — Run the schema migrations

Via the Supabase SQL Editor or via the CLI:

```bash
supabase db push
# or manually paste each file into the SQL editor, in order:
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rpc_grants.sql
```

The first migration creates `profiles`, `soldiers`, `purchases` + RLS + the auto-profile trigger. The second adds the `grant_tokens` / `revoke_tokens` RPCs that the webhook uses.

**Verify:** in SQL editor run `select count(*) from public.profiles;` — should succeed (returning 0 for a fresh project).

## Step 3 — Enable anonymous sign-ins

Supabase Dashboard → Authentication → Providers → scroll to **Anonymous Sign-Ins** → toggle on.

Without this, `signInAnonymously()` returns an error and the app silently falls back to offline-only mode. That still works but loses the whole point of Sprint 3.

## Step 4 — Configure Google OAuth (for account upgrade)

Authentication → Providers → Google:
1. Enable.
2. Follow Supabase's linked guide to create a Google Cloud OAuth client (authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`).
3. Paste client_id + client_secret into Supabase.
4. Site URL (Authentication → URL Configuration): set to your production URL (e.g. `https://toysoldiers.ai`). Add `http://localhost:5175` to additional redirect URLs for local testing.

## Step 5 — Stripe setup

1. Sign up at [stripe.com](https://stripe.com). **Start in test mode.**
2. Products → create 5 products matching `src/config/store.ts`:
   - Spark — $0.99
   - Charge — $2.99
   - Surge — $4.99
   - Arsenal — $9.99
   - War Chest — $24.99
3. Each product gets a recurring `price_id` — copy all 5.

## Step 6 — Deploy the Edge Functions

Install the Supabase CLI if you haven't: `npm install -g supabase`.

Log in and link to your project:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Set the function secrets (these are server-side only, never exposed to the browser):
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_SPARK=price_xxx
supabase secrets set STRIPE_PRICE_CHARGE=price_xxx
supabase secrets set STRIPE_PRICE_SURGE=price_xxx
supabase secrets set STRIPE_PRICE_ARSENAL=price_xxx
supabase secrets set STRIPE_PRICE_WARCHEST=price_xxx
supabase secrets set ALLOWED_ORIGIN=https://toysoldiers.ai   # or http://localhost:5175 for dev
```

Deploy all three functions:
```bash
supabase functions deploy checkout-create
supabase functions deploy stripe-webhook --no-verify-jwt    # Stripe signs its own requests
supabase functions deploy purchase-status
```

## Step 7 — Register the Stripe webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- **Endpoint URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
- **Events to listen for:**
  - `checkout.session.completed`
  - `charge.refunded`
- After creating, copy the webhook signing secret and update:
  ```bash
  supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
  ```

## Step 8 — PostHog + Sentry (optional but recommended)

1. **PostHog:** sign up, create project, copy project API key → `VITE_POSTHOG_KEY`. Set `VITE_POSTHOG_HOST` if you use EU cloud.
2. **Sentry:** create project, copy DSN → `VITE_SENTRY_DSN`.

Both are no-op when keys are unset, so you can ship without them and add later.

---

## Verification checklist

With all env vars set, run `npm run dev` and:

1. **Anonymous bootstrap.** Clear browser storage, load `/camp`. Open Supabase dashboard → Authentication → Users: a new anonymous row should appear immediately.
2. **Profile auto-creation.** In SQL editor: `select * from public.profiles order by updated_at desc limit 1;` — returns a fresh row with `tokens = 200`.
3. **Write-through.** Play tutorial, claim daily. SQL editor: `select tokens, last_daily_claim_ms from public.profiles where user_id = 'YOUR_USER_ID';` — shows updated values within ~500ms.
4. **Account upgrade.** Settings → "SAVE YOUR PROGRESS — GOOGLE". Google OAuth opens. After consent, return to game and Settings shows your email. Back in Supabase: the same user_id now has an email attached, and `is_anonymous = false`.
5. **Cross-device.** Sign in on another browser with the same Google → camp state loads identically.
6. **Stripe test purchase.** Store → buy Surge → use Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC). Return to `/camp` — ~2 seconds later, tokens jump by 600 with the chime.
7. **Webhook idempotency.** In Stripe Dashboard → Webhooks → the test event → click "Resend". Balance should not double.
8. **Refund path.** Stripe Dashboard → Payments → the test charge → "Refund". Within a second, the user's token balance drops by 600.

---

## Going to production

Before flipping to Stripe **live mode**:

1. Replace Stripe test keys with live keys via `supabase secrets set`.
2. Update `ALLOWED_ORIGIN` to your production URL only.
3. Update Stripe webhook endpoint to your live webhook URL.
4. Update Stripe Dashboard → Business Settings → Privacy policy / Terms / Refund URLs to point at your `/privacy`, `/terms`, `/refund` routes.
5. Review the legal pages in `src/pages/LegalPage.tsx` — the `COMPANY` / `CONTACT` / jurisdiction clauses need real values. **Have a lawyer review before taking real money.**
6. Set the real environment in your hosting platform (Vercel / Netlify / whatever) — the same env var names.

## Offline mode is permanent

If all this breaks tomorrow, the app keeps working. `isSupabaseEnabled()` returns false when the env vars are unset, `purchasePack()` falls back to granting locally, `initUser()` mints a local UUID, `queueSync()` logs to dev and returns. The game never blocks on the network. That's a load-bearing architectural choice, not a fallback — it's the foundation of the "no wall, ever" promise.
