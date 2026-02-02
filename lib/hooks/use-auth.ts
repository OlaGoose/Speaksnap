/**
 * Auth hooks for SpeakSnap v3 – used by UserAvatar and UserSidebar.
 * No page protection; redirectToAuth is optional (e.g. future /auth page).
 */

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import type { UseAuthReturn } from '@/lib/types/auth';

export function useAuthState(): UseAuthReturn {
  const { user, profile, loading, error } = useAuth();
  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    error,
  };
}

export function useAuthActions() {
  const { signIn, signOut, refreshUser } = useAuth();
  return { signIn, signOut, refreshUser };
}

/**
 * Optional guard: redirectToAuth() can push to /auth when implemented.
 * For now, callers may use it to open sidebar or trigger demo login.
 */
export function useAuthGuard() {
  const { isAuthenticated, loading, user } = useAuthState();
  const router = useRouter();

  const redirectToAuth = (redirectPath?: string) => {
    const currentPath =
      typeof window !== 'undefined' ? window.location.pathname : '/';
    if (currentPath !== '/auth') {
      try {
        sessionStorage.setItem('auth-redirect', redirectPath || currentPath);
      } catch {}
    }
    router.push('/auth');
  };

  return {
    isAuthenticated,
    loading,
    user,
    redirectToAuth,
  };
}
