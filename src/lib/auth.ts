// ─────────────────────────────────────────────────────────────
// Pearloom / lib/auth.ts — NextAuth configuration
// Supports: Google OAuth (with Photos API) + Email/Password
// ─────────────────────────────────────────────────────────────

import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createHash } from 'crypto';

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

/**
 * Simple password hashing — in production, use bcrypt.
 * This is a SHA-256 hash with a salt prefix for basic security.
 */
function hashPassword(password: string): string {
  const salt = process.env.NEXTAUTH_SECRET || 'pearloom-salt';
  return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

/**
 * In-memory user store for credentials auth.
 * In production, replace with database queries (Supabase, Prisma, etc.)
 */
const credentialUsers = new Map<string, { id: string; email: string; name: string; passwordHash: string }>();

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

    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        action: { label: 'Action', type: 'text' }, // 'login' | 'register'
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const passwordHash = hashPassword(credentials.password);

        if (credentials.action === 'register') {
          // Register new user
          if (credentialUsers.has(email)) {
            throw new Error('An account with this email already exists. Try signing in.');
          }
          if (credentials.password.length < 6) {
            throw new Error('Password must be at least 6 characters.');
          }
          const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const name = credentials.name?.trim() || email.split('@')[0];
          credentialUsers.set(email, { id, email, name, passwordHash });
          return { id, email, name };
        }

        // Login existing user
        const user = credentialUsers.get(email);
        if (!user || user.passwordHash !== passwordHash) {
          throw new Error('Invalid email or password.');
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
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
        // Credentials provider — no access token needed
        return { ...token, provider: 'credentials' };
      }

      // For credentials users, no token refresh needed
      if (token.provider === 'credentials') return token;

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

  pages: {
    signIn: '/dashboard',
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
