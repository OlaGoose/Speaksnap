/**
 * Auth types for SpeakSnap v3 – minimal surface for avatar/sidebar.
 * No dependency on Supabase or external auth; can be wired later.
 */

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string | null;
  level: number;
  experience: number;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}
