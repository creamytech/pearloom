# Pearloom — Setup Guide

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

### Required
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXTAUTH_SECRET=generate-a-random-string
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

### AI (at least one required)
```bash
GOOGLE_AI_KEY=your-gemini-api-key
# or
GEMINI_API_KEY=your-gemini-api-key
```

### Payments
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

### Email
```bash
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@pearloom.com
```

### Storage (R2)
```bash
CLOUDFLARE_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=pearloom-assets
NEXT_PUBLIC_R2_PUBLIC_URL=https://assets.pearloom.com
```

### Cron & Monitoring
```bash
CRON_SECRET=generate-a-random-string
SENTRY_DSN=https://...@sentry.io/...
```

---

## Supabase Tables

Run these in your Supabase SQL editor:

```sql
-- Marketplace purchases
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  price_paid INTEGER NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mp_user ON marketplace_purchases(user_email);
CREATE INDEX IF NOT EXISTS idx_mp_item ON marketplace_purchases(item_id);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_email TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  referred_email TEXT,
  status TEXT DEFAULT 'pending',
  reward_type TEXT DEFAULT 'free_template',
  reward_item_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ref_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_ref_referrer ON referrals(referrer_email);

-- Scheduled emails
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_se_pending ON scheduled_emails(status, send_at)
  WHERE status = 'pending';
```

---

## Stripe Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/billing/webhook`
3. Listen for events:
   - `checkout.session.completed` (plan upgrades + marketplace purchases)
   - `customer.subscription.deleted` (plan downgrades)
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET`

---

## Vercel Deployment

The `vercel.json` configures:
- Email cron job running every 5 minutes

After deploying, verify the cron is active in Vercel dashboard → Settings → Cron Jobs.

---

## Feature Checklist

| Feature | Status | Needs |
|---------|--------|-------|
| AI site generation | Ready | GOOGLE_AI_KEY |
| Google Photos | Ready | GOOGLE_CLIENT_ID/SECRET |
| RSVP system | Ready | Supabase tables |
| Email sequences | Ready | RESEND_API_KEY + cron |
| Marketplace | Ready | Stripe + Supabase tables |
| Referral program | Ready | Supabase referrals table |
| Offline editing | Ready | Automatic (service worker) |
| Error tracking | Ready | Optional SENTRY_DSN |
| Analytics | Ready | Automatic |
| Asset packs | Partial | Need actual artwork files on CDN |
| Custom domains | Not built | Needs Vercel/Cloudflare API |
