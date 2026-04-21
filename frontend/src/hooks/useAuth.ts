/**
 * Client-side authentication hook for the multi-tenant prospect app.
 *
 * On mount, calls `GET /api/auth/me` with credentials (so the session
 * cookie is sent) and exposes the current prospect. A 401 or 403
 * response redirects the browser to `/expired`, which is served by the
 * backend as a standalone HTML page and therefore always works,
 * even if the React app is in a weird state.
 *
 * Usage:
 *     const { user, loading, error } = useAuth();
 *     if (loading) return <Spinner />;
 *     if (!user) return null;  // redirect already triggered
 */
import { useEffect, useState } from "react";

export interface AuthUser {
  id: string;
  prospect_name: string | null;
  prospect_email: string | null;
  company_name: string | null;
  company_sector: string;
  created_at: string | null;
  expires_at: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  is_active: boolean;
  welcome_shown: boolean;
  session_count: number;
  days_left: number;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
}

export interface UseAuthOptions {
  /**
   * If true (default), a 401/403 from /api/auth/me redirects the browser
   * to /expired via a full-page navigation. Disable when you want to
   * handle the unauthenticated state yourself (e.g. a public page that
   * optionally recognises a returning prospect).
   */
  redirectOnFail?: boolean;
}

export function useAuth(options: UseAuthOptions = {}): AuthState {
  const { redirectOnFail = true } = options;
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          if (redirectOnFail && (res.status === 401 || res.status === 403)) {
            // Full-page navigation so the backend serves /expired as HTML,
            // even if the React bundle is half-loaded.
            window.location.href = "/expired";
            return;
          }
          throw new Error(`/api/auth/me returned ${res.status}`);
        }
        const user = (await res.json()) as AuthUser;
        if (!cancelled) {
          setState({ user, loading: false, error: null });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setState({ user: null, loading: false, error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [redirectOnFail]);

  return state;
}

/**
 * Clear the session server-side and send the prospect back to the root.
 * Throws on error — the caller can decide whether to surface it.
 */
export async function logout(): Promise<void> {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok && res.status !== 401) {
    // 401 is fine (already logged out); other failures bubble up.
    throw new Error(`/api/auth/logout returned ${res.status}`);
  }
}

/**
 * Mark the first-visit welcome page as seen so it isn't shown again.
 */
export async function markWelcomeSeen(): Promise<void> {
  const res = await fetch("/api/welcome/seen", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`/api/welcome/seen returned ${res.status}`);
  }
}
