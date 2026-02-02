'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  User,
  Settings,
  LogOut,
  BookOpen,
  MessageSquare,
  Star,
} from 'lucide-react';
import { useAuthState, useAuthActions } from '@/lib/hooks/use-auth';
import { getAvatarUrl } from '@/lib/utils/avatar';

export interface UserSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  href?: string;
  onClick?: () => void;
  badge?: string;
  isDestructive?: boolean;
  isDivider?: boolean;
}

function SidebarItemRow({
  item,
  onClose,
}: {
  item: SidebarItem;
  onClose: () => void;
}) {
  const Icon = item.icon;

  if (item.isDivider) {
    return (
      <div className="my-2 mx-4 h-px bg-black/8" aria-hidden="true" />
    );
  }

  const content = (
    <>
      <Icon
        className={item.isDestructive ? 'text-red-600' : 'text-primary-900'}
        size={20}
      />
      <span className="flex-1 text-base font-medium text-primary-900">
        {item.label}
      </span>
      {item.badge && (
        <span className="px-2.5 py-1 text-xs font-semibold text-white bg-primary-900 rounded-full">
          {item.badge}
        </span>
      )}
    </>
  );

  const baseClass =
    'flex items-center gap-4 px-4 py-3 w-full text-left transition-colors duration-200 rounded-lg mx-2 ' +
    (item.isDestructive
      ? 'text-red-600 hover:bg-red-50'
      : 'hover:bg-primary-100/80');

  if (item.onClick) {
    return (
      <motion.button
        type="button"
        onClick={() => {
          item.onClick?.();
          onClose();
        }}
        className={baseClass}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
      </motion.button>
    );
  }

  if (item.href) {
    return (
      <Link href={item.href} onClick={onClose} className={baseClass}>
        <motion.span
          className="flex items-center gap-4 w-full"
          whileHover={{ x: 4 }}
        >
          {content}
        </motion.span>
      </Link>
    );
  }

  return null;
}

export function UserSidebar({ isOpen, onClose }: UserSidebarProps) {
  const { user, profile, isAuthenticated } = useAuthState();
  const { signIn, signOut } = useAuthActions();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) setAvatarImgError(false);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleDemoLogin = async () => {
    try {
      await signIn('user@speaksnap.demo');
      onClose();
    } catch (err) {
      console.error('Demo login error:', err);
    }
  };

  const displayName =
    profile?.display_name ||
    profile?.username ||
    (user?.email && user.email.split('@')[0]) ||
    'User';
  const avatarUrl = getAvatarUrl(profile, user);
  const username =
    profile?.username || (user?.email && user.email.split('@')[0]) || 'user';

  const menuItems: SidebarItem[] = [
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
    {
      id: 'library',
      label: 'Library',
      icon: BookOpen,
      href: '/library',
    },
    {
      id: 'dialogue',
      label: 'Dialogue',
      icon: MessageSquare,
      href: '/camera',
      badge: 'Beta',
    },
    { id: 'settings', label: 'Settings and privacy', icon: Settings, href: '/settings' },
    { id: 'divider', label: '', icon: User, isDivider: true },
    {
      id: 'logout',
      label: 'Log out',
      icon: LogOut,
      onClick: handleSignOut,
      isDestructive: true,
    },
  ];

  if (!mounted) return null;

  const sidebarContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={sidebarRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            className="fixed top-0 left-0 w-80 max-w-[85vw] bg-primary-50 border-r border-black/8 shadow-float z-50 flex flex-col"
            style={{
              height: '100dvh',
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              willChange: 'transform',
              backfaceVisibility: 'hidden' as const,
            }}
            role="dialog"
            aria-label="Account menu"
          >
            {/* User block */}
            <div className="p-6 flex-shrink-0 border-b border-black/8">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary-900 flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
                    {avatarUrl && !avatarImgError ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover rounded-full"
                        onError={() => setAvatarImgError(true)}
                      />
                    ) : (
                      <span className="text-lg text-white font-semibold">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-primary-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      @{username}
                    </p>
                    <div className="flex items-center gap-6 mt-2 text-sm text-gray-500">
                      <span>
                        <span className="font-semibold text-primary-900">
                          {profile?.level ?? 1}
                        </span>{' '}
                        level
                      </span>
                      <span>
                        <span className="font-semibold text-primary-900">
                          {profile?.experience ?? 0}
                        </span>{' '}
                        XP
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-primary-100 border-2 border-primary-900/20 flex items-center justify-center">
                    <User className="w-7 h-7 text-primary-900" />
                  </div>
                  <p className="text-base font-medium text-primary-900">
                    Sign in to sync progress
                  </p>
                  <motion.button
                    type="button"
                    onClick={handleDemoLogin}
                    className="w-full py-3 px-4 rounded-xl bg-primary-900 text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Star size={18} />
                    Log in (demo)
                  </motion.button>
                </div>
              )}
            </div>

            {/* Menu – only when logged in */}
            {isAuthenticated && (
              <div className="flex-1 overflow-y-auto min-h-0 py-2">
                {menuItems.map((item) => (
                  <SidebarItemRow
                    key={item.id}
                    item={item}
                    onClose={onClose}
                  />
                ))}
              </div>
            )}

            {/* Bottom card – SpeakSnap style */}
            <div className="px-4 pb-4 flex-shrink-0">
              <motion.div
                className="rounded-2xl p-5 bg-white border border-black/8 shadow-float overflow-hidden"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-900 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">SS</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-primary-900 mb-0.5">
                      SpeakSnap
                    </h3>
                    <p className="text-sm text-gray-500">
                      AI English learning, anytime.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary-900 rounded-full" />
                    <span>AI dialogue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span>Shadow reading</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    <span>Diary & flashcards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    <span>Textbook study</span>
                  </div>
                </div>
                <a
                  href="/"
                  className="block w-full py-3 px-4 rounded-xl bg-primary-900 text-white text-center font-semibold hover:opacity-90 transition-opacity"
                  onClick={onClose}
                >
                  Open app
                </a>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(sidebarContent, document.body);
}
