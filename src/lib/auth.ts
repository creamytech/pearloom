// ─────────────────────────────────────────────────────────────
// Pearloom / lib/auth.ts — NextAuth configuration
// Supports: Google OAuth (with Photos API) + Email/Password
// ─────────────────────────────────────────────────────────────

import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';
import { verifyPassword } from '@/lib/password';

/**
 * Extend the default session/token types to include
 * the Google access token (for Photos API) and refresh token.
 */
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    error?: string;
    provider?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    provider?: string;
  }
}

/** Service-role client for credential lookups — RLS denies anon. */
function credentialsDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),

    // ── Google One Tap / GIS popup ─────────────────────────────
    // The stay-on-page sign-in: the GIS script (see
    // components/auth/GoogleOneTap.tsx) hands us a signed ID token
    // and we verify it server-side against Google. No redirect, no
    // consent screen — the user never leaves Pearloom.
    //
    // Sessions minted this way carry NO Google access token (One
    // Tap grants identity only), so Google-Photos import is
    // unavailable until the user runs the full OAuth button — the
    // same posture as email/password sessions.
    CredentialsProvider({
      id: 'google-onetap',
      name: 'Google One Tap',
      credentials: {
        credential: { label: 'ID token', type: 'text' },
      },
      async authorize(credentials) {
        const idToken = credentials?.credential;
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!idToken || !clientId) return null;
        try {
          // Google validates the signature; we validate the claims.
          const res = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
          );
          if (!res.ok) return null;
          const p = await res.json() as {
            aud?: string; iss?: string; sub?: string; email?: string;
            email_verified?: string | boolean; name?: string; picture?: string;
            exp?: string;
          };
          if (p.aud !== clientId) return null;
          if (p.iss !== 'https://accounts.google.com' && p.iss !== 'accounts.google.com') return null;
          if (!(p.email_verified === true || p.email_verified === 'true')) return null;
          if (!p.email || !p.sub) return null;
          if (p.exp && Number(p.exp) * 1000 < Date.now()) return null;
          return {
            id: p.sub,
            email: p.email.toLowerCase(),
            name: p.name ?? p.email.split('@')[0],
            image: p.picture,
          };
        } catch (err) {
          console.error('[auth/google-onetap] verification failed:', err);
          return null;
        }
      },
    }),

    // ── Manual accounts — email + password ─────────────────────
    // Backed by public.account_credentials (migration 20260625):
    // scrypt per-user-salt hashes via lib/password.ts. Registration
    // lives in POST /api/auth/register (rate-limited there);
    // authorize() only ever signs in. The launch-era version kept
    // accounts in an in-memory Map — every deploy erased them.
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();

        const db = credentialsDb();
        if (!db) {
          throw new Error('Sign-in is not configured on this deployment.');
        }
        const { data: row } = await db
          .from('account_credentials')
          .select('email, password_hash, display_name')
          .eq('email', email)
          .maybeSingle();
        // Same error whether the account or the password is wrong —
        // sign-in never confirms which emails have accounts.
        if (!row || !verifyPassword(credentials.password, row.password_hash)) {
          throw new Error('That email and password don’t match our records.');
        }
        void db
          .from('account_credentials')
          .update({ last_login_at: new Date().toISOString() })
          .eq('email', email)
          .then(() => {}, () => {});
        return {
          id: email,
          email,
          name: (row.display_name as string | null) ?? email.split('@')[0],
        };
      },
    }),

    // ── E2E test-only provider ─────────────────────────────────
    // Enabled ONLY when both PEARLOOM_E2E='1' and NODE_ENV!=='production'.
    // Lets Playwright sign in via /api/auth/callback/e2e using the
    // E2E_TEST_USER_EMAIL/PASSWORD env vars. Never reachable in
    // production builds — the conditional skip means the provider
    // simply isn't registered. Keeps the Google + email auth flows
    // pristine.
    ...(process.env.PEARLOOM_E2E === '1' && process.env.NODE_ENV !== 'production'
      ? [
          CredentialsProvider({
            id: 'e2e',
            name: 'E2E Test',
            credentials: {
              email: { label: 'Email', type: 'email' },
              password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
              if (!credentials?.email || !credentials?.password) return null;
              const expectedEmail = process.env.E2E_TEST_USER_EMAIL;
              const expectedPassword = process.env.E2E_TEST_USER_PASSWORD;
              if (!expectedEmail || !expectedPassword) {
                console.error('[e2e auth] E2E_TEST_USER_EMAIL/PASSWORD env vars not set.');
                return null;
              }
              if (
                credentials.email.toLowerCase().trim() !== expectedEmail.toLowerCase().trim() ||
                credentials.password !== expectedPassword
              ) {
                return null;
              }
              return {
                id: `e2e-${expectedEmail}`,
                email: expectedEmail,
                name: 'E2E Test User',
              };
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, account, user }): Promise<JWT> {
      // On initial sign in, persist the access & refresh tokens
      if (account) {
        token.provider = account.provider;
        if (account.provider === 'google') {
          return {
            ...token,
            provider: 'google',
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            accessTokenExpires: account.expires_at
              ? account.expires_at * 1000
              : Date.now() + 3600 * 1000,
          };
        }
        // Token-less providers (credentials, google-onetap, e2e) —
        // keep the real provider id so the session can distinguish
        // a One Tap Google identity from email/password.
        return { ...token, provider: account.provider };
      }

      // Only full Google OAuth sessions carry a refreshable token.
      if (token.provider !== 'google') return token;

      // Return the token if it hasn't expired
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Token has expired — try to refresh
      return refreshAccessToken(token);
    },

    async session({ session, token }): Promise<Session> {
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.provider = token.provider;
      return session;
    },
  },

  events: {
    /* Welcome email — first sign-in only. JWT strategy has no
       isNewUser signal, so lib/email/welcome.ts dedupes against
       the welcome_emails ledger. Fully fail-safe: a thrown error
       here would break sign-in, so it never throws. */
    async signIn({ user }) {
      if (!user?.email) return;
      try {
        const { sendWelcomeEmailOnce } = await import('@/lib/email/welcome');
        await sendWelcomeEmailOnce(user.email, user.name);
      } catch (err) {
        console.warn('[auth] welcome email hook failed (non-fatal):', err);
      }
    },
  },

  pages: {
    /* The sign-in PAGE — NextAuth bounces unauthenticated flows
       here. Was '/dashboard', which isn't a sign-in page at all. */
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
  },
};

/**
 * Refresh the Google access token using the refresh token.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = 'https://oauth2.googleapis.com/token';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken!,
      }),
    });

    const refreshed = await res.json();

    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}
