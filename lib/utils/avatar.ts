/**
 * Avatar URL resolution – same pattern as aha-lang.
 * Primary: profile.avatar_url (Supabase or mock).
 * Fallback: DiceBear avataaars with stable seed (user id / username / email)
 * so every user gets a deterministic avatar without upload.
 */

import type { User, Profile } from '@/lib/types/auth';

const DICEBEAR_BASE = 'https://api.dicebear.com/7.x/avataaars/svg';

/**
 * Returns the avatar URL for display. Prefers profile.avatar_url;
 * if missing, returns a DiceBear avataaars URL with a stable seed
 * (user id / username / email) so the same user always gets the same avatar.
 * Never returns null: fallback seed is "default" when user/profile are null.
 */
export function getAvatarUrl(
  profile: Profile | null,
  user: User | null
): string {
  if (profile?.avatar_url?.trim()) {
    return profile.avatar_url.trim();
  }
  const seed = user?.id || profile?.username || user?.email || 'default';
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}`;
}
