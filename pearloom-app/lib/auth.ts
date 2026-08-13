import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import type { User } from './types';

// Complete any pending browser auth sessions on app start
WebBrowser.maybeCompleteAuthSession();

// ── Storage keys ────────────────────────────────────────────────────────

const TOKEN_KEY = 'pearloom_auth_token';
const USER_KEY = 'pearloom_user';

// ── Google OAuth discovery document ─────────────────────────────────────

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

// ── Core auth functions ─────────────────────────────────────────────────

/**
 * Initiates Google OAuth sign-in, exchanges the code with the Pearloom
 * backend, and persists the resulting session.
 */
export async function signInWithGoogle(): Promise<{
  user: User;
  token: string;
} | null> {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'pearloom' });

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    usePKCE: true,
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== 'success' || !result.params.code) {
    return null;
  }

  // Exchange the auth code with our backend
  const API_BASE = __DEV__
    ? 'http://localhost:3000'
    : 'https://pearloom.com';

  const res = await fetch(`${API_BASE}/api/auth/google/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: result.params.code,
      redirect_uri: redirectUri,
      code_verifier: request.codeVerifier,
    }),
  });

  if (!res.ok) {
    throw new Error('Authentication failed');
  }

  const data = (await res.json()) as { user: User; token: string };

  // Persist to SecureStore
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));

  return data;
}

/**
 * Clears persisted auth state.
 */
export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

/**
 * Returns the persisted auth state if available, otherwise null.
 */
export async function getStoredAuth(): Promise<{
  user: User;
  token: string;
} | null> {
  const [token, userJson] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);

  if (!token || !userJson) return null;

  try {
    return { user: JSON.parse(userJson) as User, token };
  } catch {
    return null;
  }
}

// ── Auth context ────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
});

/**
 * React hook that provides auth state and actions.
 */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

/**
 * Hook containing the actual auth logic — meant to be used once inside the
 * AuthProvider so its state drives the context value.
 */
export function useAuthState(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore persisted session on mount
  useEffect(() => {
    getStoredAuth()
      .then((stored) => {
        if (stored) setUser(stored.user);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      const result = await signInWithGoogle();
      if (result) setUser(result.user);
    } catch (err) {
      console.error('Sign-in error:', err);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  return {
    user,
    loading,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}
