'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { useAuthState } from '@/lib/hooks/use-auth';
import { getAvatarUrl } from '@/lib/utils/avatar';
import { UserSidebar } from '@/components/layout/user-sidebar';

export interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  showDropdown?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
} as const;

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
} as const;

/**
 * Avatar + optional sidebar. When not logged in, click opens sidebar with "Log in" (demo).
 * When logged in, click opens sidebar with profile and menu.
 */
export function UserAvatar({
  size = 'md',
  showDropdown = false,
  className = '',
}: UserAvatarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { user, profile, isAuthenticated } = useAuthState();

  const handleAvatarClick = () => {
    if (showDropdown) {
      setIsSidebarOpen(true);
    }
  };

  // Not logged in: show login-style button that opens sidebar (no /auth redirect to avoid breaking core)
  if (!isAuthenticated || !user) {
    return (
      <>
        <motion.button
          type="button"
          onClick={handleAvatarClick}
          className={`${sizeClasses[size]} rounded-full bg-primary-900 flex items-center justify-center text-white hover:opacity-90 transition-opacity ${className}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Account"
          aria-label="Open account menu"
        >
          <User className={`${sizeClasses[size]} text-white p-1.5`} />
        </motion.button>
        <UserSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </>
    );
  }

  const displayName =
    profile?.display_name ||
    profile?.username ||
    (user.email && user.email.split('@')[0]) ||
    'User';
  const avatarUrl = getAvatarUrl(profile, user);

  return (
    <>
      <motion.button
        type="button"
        onClick={handleAvatarClick}
        className={`${sizeClasses[size]} rounded-full bg-primary-900 flex items-center justify-center overflow-hidden hover:opacity-90 transition-opacity ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open account menu"
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            className={`${textSizeClasses[size]} text-white font-semibold`}
          >
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </motion.button>
      <UserSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </>
  );
}

/** Avatar-only, no sidebar on click. */
export function SimpleAvatar({
  size = 'md',
  className = '',
}: Omit<UserAvatarProps, 'showDropdown'>) {
  return (
    <UserAvatar size={size} showDropdown={false} className={className} />
  );
}
